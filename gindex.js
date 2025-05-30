const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing ?url parameter' });

    try {
        const formData = await scrape(url);
        res.json(formData);
    } catch (error) {
        console.error('Error in /scrape route:', error);
        res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

async function scrape(url) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const formData = await page.evaluate(() => {
            const questions = [];
            const questionEls = document.querySelectorAll('.Qr7Oae'); // Main container for each question

            questionEls.forEach(el => {
                const questionTextEl = el.querySelector('.M7eMe');
                const question = questionTextEl ? questionTextEl.innerText.trim() : 'Untitled question';

                let name = null;
                let type = 'Unknown';
                let options = [];
                let hasOtherOptions = false;

                // --- Type Detection and Specific Element Targeting ---

                // 1. Linear Scale (most specific radiogroup)
                // Linear scales often have specific label classes like .Zki2Ve for the numbers 1-5
                const linearScaleRadios = el.querySelector('[role="radiogroup"][aria-describedby]');
                const isActualLinearScale = linearScaleRadios && linearScaleRadios.querySelector('.Zki2Ve');

                if (isActualLinearScale) {
                    type = 'Linear Scale';
                    const firstRadioInScale = linearScaleRadios.querySelector('input[type="radio"][name^="entry."]');
                    if (firstRadioInScale) {
                        name = firstRadioInScale.getAttribute('name');
                    } else { // Fallback for some complex linear scales (e.g., grids)
                        const hiddenInput = el.querySelector('input[type="hidden"][name^="entry."]');
                        if (hiddenInput) name = hiddenInput.getAttribute('name');
                    }

                    const scaleOptionLabels = linearScaleRadios.querySelectorAll('.Zki2Ve');
                    if (scaleOptionLabels.length > 0) { // Check if any labels found
                        const numbers = Array.from(scaleOptionLabels).map(lbl => parseInt(lbl.innerText.trim(), 10)).filter(n => !isNaN(n));
                        if (numbers.length > 1) {
                            const min = Math.min(...numbers);
                            const max = Math.max(...numbers);
                            for (let i = min; i <= max; i++) {
                                options.push(String(i));
                            }
                        } else if (numbers.length === 1) { // Case where only one number might be found (less common)
                            options.push(String(numbers[0]));
                        } else {
                             options.push("Scale numbers not clearly identifiable");
                        }
                    } else {
                        options.push("Scale unavailable");
                    }
                }
                // 2. Multiple Choice (general radiogroup, AFTER linear scale)
                else if (el.querySelector('[role="radiogroup"]')) {
                    type = 'Multiple Choice';
                    const radioGroup = el.querySelector('[role="radiogroup"]');
                    const firstRadio = radioGroup.querySelector('input[type="radio"][name^="entry."]');
                    if (firstRadio) {
                        name = firstRadio.getAttribute('name');
                    }
                    // More robust option text selectors
                    radioGroup.querySelectorAll('.docssharedWizToggleLabeledContent .pXeIKc, div[jsname="V68bde"] span').forEach(opt => { // pXeIKc for text, V68bde for option container
                        const text = opt.innerText.trim();
                        if (text && text.toLowerCase() !== 'other') options.push(text);
                    });
                    if (radioGroup.querySelector('.freebirdFormviewerComponentsQuestionRadioOtherInputElement, .H2Ybhc.HLRect')) {
                        hasOtherOptions = true;
                    }
                }
                // 3. Checkboxes
                // Common wrapper class for checkboxes: Y6Myld or looking for input type directly.
                else if (el.querySelector('.Y6Myld input[type="checkbox"], .freebirdFormviewerComponentsQuestionCheckboxRoot input[type="checkbox"]')) {
                    type = 'Checkboxes';
                    const checkboxGroup = el.querySelector('.Y6Myld, .freebirdFormviewerComponentsQuestionCheckboxRoot');
                    const firstCheckbox = checkboxGroup ? checkboxGroup.querySelector('input[type="checkbox"][name^="entry."]') : el.querySelector('input[type="checkbox"][name^="entry."]');

                    if (firstCheckbox) {
                        name = firstCheckbox.getAttribute('name');
                    }
                    // Option scraping for checkboxes
                    const optElements = checkboxGroup ?
                                        checkboxGroup.querySelectorAll('.docssharedWizToggleLabeledContent .pXeIKc, div[jsname="V68bde"] span') : // Similar to MC
                                        el.querySelectorAll('.docssharedWizToggleLabeledContent .pXeIKc'); // Fallback if no clear group
                    optElements.forEach(opt => {
                        const text = opt.innerText.trim();
                        if (text && text.toLowerCase() !== 'other') options.push(text);
                    });
                    if (el.querySelector('.freebirdFormviewerComponentsQuestionCheckboxOtherInputElement, .RVLOe')) {
                        hasOtherOptions = true;
                    }
                }
                // 4. Dropdown
                else if (el.querySelector('[role="listbox"]')) {
                    type = 'Dropdown';
                    // Name for dropdown is often a hidden input associated with it.
                    // Look for a hidden input within the question block `el`
                    const hiddenInputForDropdown = el.querySelector('input[type="hidden"][name^="entry."]');
                    if (hiddenInputForDropdown) {
                        name = hiddenInputForDropdown.getAttribute('name');
                    } else {
                        // Sometimes the listbox itself might have a jscontroller that updates an input elsewhere,
                        // or a related input might exist. This is harder to get generically.
                        // A less common pattern, but check if the main element has the name
                        const listboxEl = el.querySelector('div[data-value]'); // Dropdowns often have a data-value attribute on their main div
                        if (listboxEl && listboxEl.getAttribute('name')?.startsWith('entry.')){
                             name = listboxEl.getAttribute('name');
                        }
                    }

                    // Options for Dropdown (often in spans with role="option", but might be hidden until interaction)
                    // Selector targets options generally present in DOM, possibly hidden.
                    el.querySelectorAll('div[role="option"] .quantumWizMenuPaperselectContent > span, div[role="option"] span.MocG8c').forEach(opt => {
                        const text = opt.innerText.trim();
                        // Filter out placeholder values like "Choose" or "Pilih"
                        if (text && text.toLowerCase() !== 'choose' && text.toLowerCase() !== 'pilih' &&
                            !opt.closest('.appsMaterialWizMenuPaperselectPlaceholder')) { // Check if parent is placeholder
                            options.push(text);
                        }
                    });
                }
                // 5. Short Answer (various input types like text, date, time)
                else if (el.querySelector('input.whsOnd.zHQkBf[type="text"], input[type="date"], input[type="time"], input[type="email"], input[type="number"], input[type="url"]')) {
                    type = 'Short Answer'; // Could be specialized (e.g., 'Date') if needed
                    const shortAnswerInput = el.querySelector('input.whsOnd.zHQkBf[type="text"], input[type="date"], input[type="time"], input[type="email"], input[type="number"], input[type="url"]');
                    if (shortAnswerInput && shortAnswerInput.getAttribute('name')?.startsWith('entry.')) {
                        name = shortAnswerInput.getAttribute('name');
                    }
                }
                // 6. Paragraph (textarea)
                else if (el.querySelector('textarea.KHxj8b.tL9Q4c')) {
                    type = 'Paragraph';
                    const paragraphInput = el.querySelector('textarea.KHxj8b.tL9Q4c');
                    if (paragraphInput && paragraphInput.getAttribute('name')?.startsWith('entry.')) {
                        name = paragraphInput.getAttribute('name');
                    }
                }

                // Fallback for name if still null, for types that definitely need one
                if (!name && ['Short Answer', 'Paragraph', 'Dropdown', 'Multiple Choice', 'Checkboxes', 'Linear Scale'].includes(type)) {
                    // Try a more general search for any input/textarea with the entry.xxx pattern within this question block
                    const fallbackNamedInput = el.querySelector('input[name^="entry."], textarea[name^="entry."]');
                    if (fallbackNamedInput) {
                        name = fallbackNamedInput.getAttribute('name');
                    }
                }
                
                // Cleanup for "sentinel" names if a more direct one wasn't found but type is clear
                // (This is advanced and might not be needed if the above works better)
                // e.g. if name ends with _sentinel, and we know it's MC/Checkbox, it might be the best we can get.

                questions.push({ name, question, type, options, hasOtherOptions });
            });

            return questions;
        });
        return { questions: formData };

    } catch (err) {
        console.error('Error during scraping:', err);
        throw err; 
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}