const express = require('express');
const http = require('http');
const https = require('https');
const puppeteer = require('puppeteer');
const { Faker, id_ID } = require('@faker-js/faker');
const app = express();
const PORT = 3000;
app.set('view engine', 'ejs');
app.use(express.static('public'));
const RESPOND_COUNT_HARD_LIMIT = 999;
// !FIX dont do ts
const HARD_CODED_NAMEFAKER = true;
const faker = new Faker({
    locale:[id_ID]
})
faker.locale = 'id_ID'
// const formData = require("..json");

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    formData = await scrape(url)
    // res.json(formData)
    const data = {
        url: url,
        "questions": formData.questions
    };
    res.render('index', data)
});

app.get('/', (req, res) => {
    res.render('home')
})

app.post('/save-probabilities', express.urlencoded({ extended: true }), (req, res) => {
    const formData = req.body;
    const respondCount = req.body.respondCount || 1;
    // const respondCount = 1;
    if (respondCount > RESPOND_COUNT_HARD_LIMIT) { respondCount = RESPOND_COUNT_HARD_LIMIT; }

    // Extract all unique question IDs from the form data
    
    let baseUrl = formData.url;
    let data = parseData(formData);
    let nameFakerEntry
    let cityFakerEntry
    let genderFakerEntry
    let newData = []
    let urlsToSend = []
    let urlsToSendText
    let unique = []
    // separate between data and generated data
    for (const entry of data) {
        if (formData['name-faker'] && entry.name == formData['name-faker'])  {
            nameFakerEntry = entry
        }
        else if(formData['gender-faker'] && entry.name == formData['gender-faker'] ){
            genderFakerEntry = entry
        }
        else if(formData['city-faker'] && entry.name == formData['city-faker'] ){
            cityFakerEntry = entry
        }
        else {
            newData.push(entry)
        }
    }
    // console.log(newData)
    for (let i = 0; i < respondCount; i++) {
        let fakerGender = Math.random() < 0.3?'Laki-laki' : 'Perempuan'
        let fakerName = faker.person.firstName(fakerGender=="Perempuan"?"female":"male")
        let fakerCity = faker.location.city()
        if(Math.random() < 0.7){
            fakerName = fakerName.toLowerCase()
        }
        const formUrl = decodeToGoogleFormUrl(baseUrl, newData);
        const urlParams = new URLSearchParams();
        if (formData["name-faker"]) {
            urlParams.append(nameFakerEntry.name, fakerName)
        }
        if (formData["gender-faker"]) {
            urlParams.append(genderFakerEntry.name, fakerGender)
        }
        if (formData["city-faker"]) {
            urlParams.append(cityFakerEntry.name, fakerCity)
        }
        const newForm = `${formUrl}&${urlParams.toString()}`;
        urlsToSend.push(newForm)
    }
    
    console.log(urlsToSend)
    res.render('buffer',{urlsToSend})
    return 
    // let urlsuccess = 0;
    // let urlLinkStatus = [];
    // let promises = urlsToSend.map((u) => {
    //     return new Promise((resolve) => {
    //         setTimeout(function() {
    //             https.get(u, (response) => {
    //                 urlLinkStatus.push({u, s:response.statusCode})
    //                 if (response.statusCode == 200) {
    //                     urlsuccess++;
    //                 }
    //                 console.log(u, response.statusCode);
    //                 resolve(); // Resolve the promise after the request is completed
    //             });
    //         }, 200);
    //     });
    // });

    // Wait for all requests to finish
    Promise.all(promises).then(() => {
        res.send([urlsuccess, urlsToSend, urlLinkStatus, urlsToSend.length]);
    });
    return
    if (formData['dont-repeat_name']) {
        for (const entry of data) {
            // console.log("entreee", entry)
            if (entry.name == formData['dont-repeat_target']) {
                target = entry
            }
            else {
                newData.push(entry)
            }
        }
        target.items.forEach((i, index) => {
            unique.push(i.option)
            const formUrl = decodeToGoogleFormUrl(baseUrl, newData);
            const urlParams = new URLSearchParams();
            urlParams.append(target.name,i.option)
            const newForm = `${formUrl}&${urlParams.toString()}`;
            urlsToSend.push(newForm)
            urlsToSendText += '\n'+i.option
            // https.get(newForm, (response) => {
            //     console.log(formUrl + "\n")
            // });
        })
        res.render('dontRepeat',{urlsToSend, unique})
        // res.json(urlsToSend)
        // res.send('✅ Successfully submitted to Google Form ' + decodeToGoogleFormUrl(baseUrl, data) + ' with unique ' +  urlsToSendText);
        return
    }

    // res.json(formUrl)
    for (let i = 0; i < respondCount; i++) {
        const formUrl = decodeToGoogleFormUrl(baseUrl, data);
        // https.get(formUrl, (response) => {
        //     console.log(formUrl + "\n")
        // });
    }
    res.send('✅ Successfully submitted to Google Form ' + decodeToGoogleFormUrl(baseUrl, data) + ' with ' + respondCount + ' responses');
    // res.send('Data received and processed');
    return
});

app.post('/execute-links', express.urlencoded({ extended: true }), (req, res) => {
    let urlsuccess = 0;
    let urlLinkStatus = [];
    const urlsToSend = req.body.urls
    let promises = urlsToSend.map((u) => {
        return new Promise((resolve) => {
            setTimeout(function() {
                https.get(u, (response) => {
                    urlLinkStatus.push({u, s:response.statusCode})
                    if (response.statusCode == 200) {
                        urlsuccess++;
                    }
                    console.log(u, response.statusCode);
                    resolve(); // Resolve the promise after the request is completed
                });
            }, 200);
        });
    });

    Promise.all(promises).then(() => {
        res.send([{WARNING:"RETURN AFTER RESPOND, DO NOT RELOAD HERE",urlsuccess, targetCount:urlsToSend.length, urlsToSend, urlLinkStatus}]);
    });
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})


function decodeToGoogleFormUrl(baseUrl, data) {
    baseUrl = baseUrl.replace(/viewform/, 'formResponse');
    const urlParams = new URLSearchParams();

    for (const entry of data) {
        // console.log(entry)
        if (entry.name == "url") {
            continue
        }
        const name = entry.name; // This is the Google Form entry ID (e.g., "entry.1166587114")
        const isMultipleChoice = entry.checkbox; // This is a boolean indicating if the question allows multiple selections
        const hasOtherOption = entry.hasOtherOption; // This indicates if the question has an "Other" option
        const items = entry.items; // This is the array of options and their chances
        // console.log(entry)
        // Use a variable to hold the selected result, which might be a string or an array of strings
        let selectedResult;

        // Corrected conditional: 'entry.type' is a boolean, so compare directly to 'true' or 'false'
        if (isMultipleChoice) { // If 'type' is true, it means independent/checkbox selection
            selectedResult = selectIndependentOptions(items);
            // console.log(name,"checkboxRAN++++++++++++++++", selectedResult)

            // For independent selections (checkboxes), append each selected option
            selectedResult.forEach(option => {
                if (hasOtherOption && option.isOtherOption) {
                    urlParams.append(name + '.other_option_response', option.option)
                    urlParams.append(name, '__other_option__')
                }
                else{
                    urlParams.append(name, option.option);
                }
            });

        } else { // If 'type' is false, it means weighted/radio selection
            selectedResult = selectWeightedRandomItem(items);
            // console.log(name,"USUALLRUN++++++++++++++++", selectedResult)
            if (selectedResult.isOtherOption) {
                urlParams.append(name + '.other_option_response', selectedResult.option)
                urlParams.append(name, '__other_option__')
            }
            else{
                // For weighted selections (radio), append the single selected option
                urlParams.append(name, selectedResult.option);
            }
        }
    }

    // Combine the base URL with the generated query parameters
    return `${baseUrl}&${urlParams.toString()}`;
}

function parseData(formData) {
    const remappedOutput = [];

    for (const [entry, value] of Object.entries(formData)) {
        if (entry === "url" || entry === "respondCount") continue;
        // if entry ends with answers do something
        if (entry.endsWith('_answers')) {
            const questionId = entry.split('_')[0];
            const multipleChoice = formData[`${questionId}_isMultipleChoice`];
            const otherOptionResponse = formData[`${questionId}.other_option_response`];
            const hasOtherOption = formData[`${questionId}.is_other_option`];
            const items = []
            value.forEach((answer, i) => {
                // console.log("answer", answer)
                let isOtherOption = otherOptionResponse == answer;
                const newAnswer = {
                    option:answer,
                    chance: formData[`${questionId}_chances`][i] || 0,
                    isOtherOption
                };
                items.push(newAnswer)
            })
            const chances = (formData[`${questionId}_chances`] || []).map(Number);
            const isMultipleChoice = multipleChoice?multipleChoice[0]:false;
            const otherOption = formData[entry.split('_')[0] + '.other_option_response']
            remappedOutput.push({
                name: questionId,
                checkbox: isMultipleChoice,
                hasOtherOption: hasOtherOption?? false,
                items
            });
        }
    }
    return remappedOutput;
}

function remapParsedData(allEntriesData) {
    const remappedOutput = []; // Initialize as an array for the final output
    // Iterate over each key (e.g., "entry.XXX")
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
                checkbox: entryDetails.multipleChoice ?? false,
                items: currentEntryRemappedItems
            });
        }
    }

    return remappedOutput;
}

function selectIndependentOptions(optionsWithProbabilities) {
    const selectedOptions = [];
    for (const item of optionsWithProbabilities) {
        const chance = parseFloat(item.chance)
        // Assume 'chance' is a number, either 0.0-1.0 or 0-100. Normalize to 0.0-1.0.
        const probability = chance > 1 ? chance / 100 : chance;

        if (Math.random() < probability) {
            selectedOptions.push(item);
        }
    }
    return selectedOptions;
}

function selectWeightedRandomItem(optionsWithWeights) {
    let totalWeight = 0;
    for (const item of optionsWithWeights) {
        totalWeight += parseFloat(item.chance); // 'chance' is a weight here
    }
    const randomNumber = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const item of optionsWithWeights) {
        cumulativeWeight += parseFloat(item.chance);
        if (randomNumber < cumulativeWeight) {
            return item; // Return the selected option's name
        }
    }

    // Fallback: Returns the last item if floating point precision causes issues at the very end
    return optionsWithWeights[optionsWithWeights.length - 1];
}

async function scrape(url) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        // Wait specifically for the container or inputs to appear
        // await page.waitForSelector('[jsname="o6bZLc"] input');

        // Check if inputs exist
        // const inputs = await page.$$('div[jsname="o6bZLc"] input');

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

                let type = 'Unknown';
                if (el.querySelector('.zwllIb')) type = 'Multiple Choice';
                else if (el.querySelector('.lLfZXe.fnxRtf.EzyPc')) type = 'Multiple Choice Grid';
                else if (el.querySelector('.V4d7Ke.wzWPxe.OIC90c')) type = 'Checkbox Grid';
                else if (el.querySelector('.ghIlv.s6sSOd')) type = 'Rating';
                else if (el.querySelector('.Zki2Ve')) type = 'Linear Scale';
                else if (el.querySelector('[role=option]')) type = 'Dropdown';
                else if (el.querySelector('.eBFwI')) type = 'Checkboxes';
                else if (el.querySelector('textarea')) type = 'Paragraph';
                else if (el.querySelector('input[type="text"]')) type = 'Short Answer';
                if(type == "Unknown") return

                if (name == null && type != "Unknown") {
                    name = externalInputIndex
                    externalInputIndex++
                } else {
                    name = name.split('_')[0];
                }
                
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
                else if(type === "Rating"){
                    type = "Linear Scale"
                    el.querySelector('.vp2Xfc').querySelectorAll('.UNQpic').forEach((r)=>{
                        options.push(r.textContent.trim())
                    })
                }
                else if(type === "Multiple Choice Grid"){
                    const options = []
                    const row = el.querySelectorAll('.lLfZXe.fnxRtf.EzyPc')
                    el.querySelector('.ssX1Bd.KZt9Tc').querySelectorAll('.OIC90c').forEach((c)=>{
                        options.push(c.textContent)
                    })
                    row.forEach((r,i)=>{
                        let name = r.querySelector("input[name^=entry]").getAttribute('name')
                        name = name.split('_')[0];
                        // question.push({name:r.textContent, })
                        // querySelector('.ssX1Bd.KZt9Tc').querySelectorAll('.OIC90c')
                        questions.push({ name, question:r.textContent, type:"Multiple Choice", options, hasOtherOptions });
                    })
                }
                else if(type === "Checkbox Grid"){
                    el.querySelector('.ssX1Bd.KZt9Tc').querySelectorAll('.V4d7Ke.OIC90c').forEach((opt)=>{
                        options.push(opt.textContent.trim())
                    })

                    el.querySelectorAll('.EzyPc.mxSrOe').forEach((r)=>{
                        let name = r.querySelector("input[name^=entry]").getAttribute('name')
                        name = name.split('_')[0];
                        questions.push({ name, question, type:"Checkbox", options, hasOtherOptions });
                    });
                }

                if(type != "Multiple Choice Grid" || type != "Checkbox Grid"){
                    // console.log(type)
                    // !FIX hacky
                    if(type == "Checkbox Grid"){}else{
                        questions.push({ name, question, type, options, hasOtherOptions });
                    }
                }
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