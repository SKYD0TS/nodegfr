// run this in console and get the questions

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
    if(type == "Unknown") return;

    if (name == null && type != "Unknown") {
        name = externalInputIndex;
        externalInputIndex++;
    } else {
        name = name.split('_')[0];
    }

    let hasOtherOptions = false;
    const options = [];
    if (type === 'Multiple Choice') {
        el.querySelectorAll('.zwllIb:not(.zfdaxb)').forEach(opt => {
            const text = opt.innerText.trim();
            options.push(text);
        });
        if (el.querySelector('.zfdaxb')) {
            hasOtherOptions = true; // Add "Other" option if it exists
        }
    } else if (type === 'Dropdown') {
        el.querySelectorAll('.OIC90c[role="option"]').forEach(opt => {
            const text = opt.innerText.trim();
            if (text) options.push(text);
        });
    } else if (type === 'Checkboxes') {
        el.querySelectorAll('.eBFwI:not(.RVLOe)').forEach(opt => {
            const text = opt.innerText.trim();
            if (text) options.push(text);
            if (el.querySelector('.RVLOe')) {
                hasOtherOptions = true; // Add "Other" option if it exists
            }
        });
    } else if (type === "Linear Scale") {
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
    } else if (type === "Rating") {
        type = "Linear Scale";
        el.querySelector('.vp2Xfc').querySelectorAll('.UNQpic').forEach((r) => {
            options.push(r.textContent.trim());
        });
    } else if (type === "Multiple Choice Grid") {
        const options = [];
        const row = el.querySelectorAll('.lLfZXe.fnxRtf.EzyPc');
        el.querySelector('.ssX1Bd.KZt9Tc').querySelectorAll('.OIC90c').forEach((c) => {
            options.push(c.textContent);
        });
        row.forEach((r, i) => {
            let name = r.querySelector("input[name^=entry]").getAttribute('name');
            name = name.split('_')[0];
            questions.push({ name, question: r.textContent, type: "Multiple Choice", options, hasOtherOptions });
        });
    } else if (type === "Checkbox Grid") {
        el.querySelector('.ssX1Bd.KZt9Tc').querySelectorAll('.V4d7Ke.OIC90c').forEach((opt) => {
            options.push(opt.textContent.trim());
        });

        el.querySelectorAll('.EzyPc.mxSrOe').forEach((r) => {
            let name = r.querySelector("input[name^=entry]").getAttribute('name');
            name = name.split('_')[0];
            questions.push({ name, question, type: "Checkbox", options, hasOtherOptions });
        });
    }

    if (type != "Multiple Choice Grid" || type != "Checkbox Grid") {
        // console.log(type)
        // !FIX hacky
        if (type == "Checkbox Grid") {} else {
            questions.push({ name, question, type, options, hasOtherOptions });
        }
    }
});

let externalInputsName = [];
document.querySelectorAll('input[name^=entry]:not([name$=sentinel])').forEach((i) => { externalInputsName.push(i.name) });

questions.forEach(q => {
    if (typeof q.name === 'number') {
        q.name = externalInputsName[q.name]; // Generate a random name if not found
    }
});

console.log(questions); // Output questions in the console
