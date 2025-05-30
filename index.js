const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 3000;
// const formData = require('./..json');
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    formData = await scrape(url)

    // debugginz
    // res.send(formData)
    // return

    // res.json(formData)
    const data = {
        "questions": formData.questions
    };
    res.render('index', data)
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

function decodeToGoogleFormUrl(data) {
    // IMPORTANT: Replace 'YOUR_GOOGLE_FORM_ID' with your actual Google Form ID
    const baseUrl = 'https://docs.google.com/forms/d/e/YOUR_GOOGLE_FORM_ID/viewform?usp=pp_url';
    const urlParams = new URLSearchParams();

    // Iterate through each entry (e.g., a question or field in the form)
    for (const entry of data) {
        const name = entry.name; // This is the Google Form entry ID (e.g., "entry.1166587114")
        const items = entry.items; // This is the array of options and their chances

        // Use a variable to hold the selected result, which might be a string or an array of strings
        let selectedResult;

        // Corrected conditional: 'entry.type' is a boolean, so compare directly to 'true' or 'false'
        if (entry.type === true) { // If 'type' is true, it means independent/checkbox selection
            selectedResult = selectIndependentOptions(items);

            // For independent selections (checkboxes), append each selected option
            selectedResult.forEach(option => {
                urlParams.append(name, option);
            });

        } else { // If 'type' is false, it means weighted/radio selection
            selectedResult = selectWeightedRandomItem(items);
            // For weighted selections (radio), append the single selected option
            urlParams.append(name, selectedResult); // selectedResult is already the option string
        }
    }

    // Combine the base URL with the generated query parameters
    return `${baseUrl}&${urlParams.toString()}`;
}

app.post('/save-probabilities', express.urlencoded({ extended: true }), (req, res) => {
    const respondCount = 0
    const formData = req.body;
    const parsedData = {};

    // Extract all unique question IDs from the form data
    const questionIds = new Set(
        Object.keys(formData).map(key => key.split('_')[0]
        ));

    // Process each question
    questionIds.forEach(questionId => {
        parsedData[questionId] = {
            answers: [],
            chances: [],
            multipleChoice: false
        };

        // Process regular answers and chances
        if (formData[`${questionId}_answers`]) {
            if(formData[`${questionId}_isMultipleChoice`] == "true") parsedData[questionId].multipleChoice = true;
            parsedData[questionId].answers = formData[`${questionId}_answers`];
            parsedData[questionId].chances = formData[`${questionId}_chances`].map(Number);
        }
    });
    const data = remapParsedData(parsedData);
    // res.json(data);
    const formUrl = decodeToGoogleFormUrl(data);
    res.json(formUrl)


    // res.send('Data received and processed');
});

function remapParsedData(allEntriesData) {
    const remappedOutput = []; // Initialize as an array for the final output

    // Iterate over each key (e.g., "entry.1166587114", "another.entry.id")
    for (const entryKey in allEntriesData) {
        // Ensure the key belongs to the object itself, not its prototype chain
        if (Object.prototype.hasOwnProperty.call(allEntriesData, entryKey)) {
            const entryDetails = allEntriesData[entryKey];

            // Initialize an array for the current entry's remapped items
            const currentEntryRemappedItems = [];

            // Loop through answers and chances for the current entry
            // Note: No validation checks are performed here as per previous request.
            // If entryDetails.answers or entryDetails.chances are null/undefined/not arrays,
            // or have mismatched lengths, this loop might throw errors.
            for (let i = 0; i < entryDetails.answers.length; i++) {
                const answer = entryDetails.answers[i];
                const chance = entryDetails.chances[i];

                // Create the item object with 'option' and 'chance' properties
                const itemObject = {
                    option: answer,
                    chance: chance
                };

                currentEntryRemappedItems.push(itemObject);
            }

            // Create the object for the current entry and push it to the final output array
            remappedOutput.push({
                name: entryKey,
                type: entryDetails.multipleChoice ?? false,
                items: currentEntryRemappedItems
            });
        }
    }

    return remappedOutput;
}

function selectIndependentOptions(optionsWithProbabilities) {
    const selectedOptions = [];
    for (const item of optionsWithProbabilities) {
        const option = item.option;
        // Assume 'chance' is a number, either 0.0-1.0 or 0-100. Normalize to 0.0-1.0.
        const probability = item.chance > 1 ? item.chance / 100 : item.chance;

        if (Math.random() < probability) {
            selectedOptions.push(option);
        }
    }
    return selectedOptions;
}

function selectWeightedRandomItem(optionsWithWeights) {
    let totalWeight = 0;
    for (const item of optionsWithWeights) {
        totalWeight += item.chance; // 'chance' is a weight here
    }

    const randomNumber = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const item of optionsWithWeights) {
        cumulativeWeight += item.chance;
        if (randomNumber < cumulativeWeight) {
            return item.option; // Return the selected option's name
        }
    }

    // Fallback: Returns the last item if floating point precision causes issues at the very end
    return optionsWithWeights[optionsWithWeights.length - 1].option;
}

async function scrape(url) {
    if (!url) return res.status(400).json({ error: 'Missing ?url parameter' });

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        // Wait specifically for the container or inputs to appear
        await page.waitForSelector('[jsname="o6bZLc"] input');

        // Check if inputs exist
        // const inputs = await page.$$('div[jsname="o6bZLc"] input');
        // console.log(`Found ${inputs.length} hidden inputs`);

        // html = await page.content();
        // return html

        const formData = await page.evaluate(() => {
            const questions = [];
            const questionEls = document.querySelectorAll('.Qr7Oae');
            let externalInputIndex = 0;
            questionEls.forEach((el, i) => {
                const questionTextEl = el.querySelector('.M7eMe'); // Get the question text element
                const question = questionTextEl ? questionTextEl.innerText.trim() : 'Untitled question';

                let name = null; // how
                const inputEl = el.querySelector('input[name^="entry."], textarea[name^="entry."]');
                if (inputEl) {
                    name = inputEl.getAttribute('name');
                } else {
                    // For radio groups or checkboxes, the name might be on the first input
                    const radioOrCheckInput = el.querySelector('input[type="radio"][name^="entry."], input[type="checkbox"][name^="entry."]');
                    if (radioOrCheckInput) {
                        name = radioOrCheckInput.getAttribute('name');
                    }
                }

                if (name == null) {
                    name = externalInputIndex
                    externalInputIndex++
                } else {
                    name = name.split('_')[0];
                }

                let type = 'Unknown';
                if (el.querySelector('.zwllIb')) type = 'Multiple Choice';
                else if (el.querySelector('.Zki2Ve')) type = 'Linear Scale';
                else if (el.querySelector('[role=option]')) type = 'Dropdown';
                else if (el.querySelector('.eBFwI')) type = 'Checkboxes';
                else if (el.querySelector('textarea')) type = 'Paragraph';
                else if (el.querySelector('input[type="text"]')) type = 'Short Answer';

                let hasOtherOptions = false;
                const options = [];
                if (type === 'Multiple Choice') {
                    el.querySelectorAll('.zwllIb:not(.zfdaxb)').forEach(opt => {
                        const text = opt.innerText.trim();
                        options.push(text)
                    })
                    if (el.querySelector('.zfdaxb')) {
                        hasOtherOptions = true; // Add "Other" option if it exists
                    }
                }
                else if (type === 'Dropdown') {
                    el.querySelectorAll('.OIC90c[role="option"]').forEach(opt => {
                        const text = opt.innerText.trim();
                        if (text) options.push(text);
                    });
                }
                else if (type === 'Checkboxes') {
                    el.querySelectorAll('.eBFwI:not(.RVLOe)').forEach(opt => {
                        const text = opt.innerText.trim();
                        if (text) options.push(text);
                        if (el.querySelector('.RVLOe')) {
                            hasOtherOptions = true; // Add "Other" option if it exists
                        }
                    });
                }
                else if (type === "Linear Scale") {
                    const numbersInEl = Array.from(el.querySelectorAll('.Zki2Ve')).map(e => e.innerText.trim());
                    const numbers = numbersInEl.length > 0
                        ? numbersInEl
                        : Array.from(document.querySelectorAll('.Zki2Ve')).map(e => e.innerText.trim());

                    if (numbers.length > 1) {
                        const min = parseInt(numbers[0]);
                        const max = parseInt(numbers[numbers.length - 1]);
                        range = [];
                        for (let i = min; i <= max; i++) {
                            range.push(i);
                        }
                        options.push(...range);
                    } else {
                        options.push("Scale unavailable");
                    }
                }
                questions.push({ name, question, type, options, hasOtherOptions });
            });
            let externalInputsName = [];
            document.querySelectorAll('input[name^=entry]:not([name$=sentinel])').forEach((i) => { externalInputsName.push(i.name) })

            questions.forEach(q => {
                if (typeof q.name === 'number') {
                    // q.name = "fuck";
                    q.name = externalInputsName[q.name]; // Generate a random name if not found
                }
            });
            return questions;
        });
        await browser.close();

        return { questions: formData };
    } catch (err) {
        console.error(err);
        return { error: 'Scraping failed' };
    }
}