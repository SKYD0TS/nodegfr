const formData = await page.evaluate(() => {
    const questions = [];
    const questionEls = document.querySelectorAll('.Qr7Oae');

    questionEls.forEach(el => {
        const questionTextEl = el.querySelector('.M7eMe');
        const question = questionTextEl ? questionTextEl.innerText.trim() : 'Untitled question';

        let name = null;
        const nameEl = el.querySelector('input[name^="entry."], select[name^="entry."], textarea[name^="entry."]');
        if (nameEl) {
            name = nameEl.getAttribute('name');
        }

        // Determine the type of the question
        let type = 'Unknown';
        if (el.querySelector('[role=presentation]')) type = 'Linear Scale';
        else if (el.querySelector('[role="radiogroup"]')) type = 'Multiple Choice';
        else if (el.querySelector('[role=checkbox]')) type = 'Checkboxes';
        else if (el.querySelector('[role=listbox]')) type = 'Dropdown';
        else if (el.querySelector('input[type="text"]')) type = 'Short Answer';
        else if (el.querySelector('textarea')) type = 'Paragraph';

        let hasOtherOptions = false;
        const options = [];
        if (type === 'Multiple Choice') {
            el.querySelectorAll('.zwllIb:not(.zfdaxb)').forEach(opt => {
                const text = opt.innerText.trim();
                options.push(text);
            });
            if (el.querySelector('.zfdaxb')) {
                hasOtherOptions = true;
            }
        } else if (type === 'Dropdown') {
            el.querySelectorAll('[role="option"]').forEach(opt => {
                const text = opt.innerText.trim();
                if (text) options.push(text);
            });
        } else if (type === 'Checkboxes') {
            el.querySelectorAll('.eBFwI:not(.RVLOe)').forEach(opt => {
                const text = opt.innerText.trim();
                if (text) options.push(text);
            });
            if (el.querySelector('.RVLOe')) {
                hasOtherOptions = true;
            }
        } else if (type === "Linear Scale") {
            const numbersInEl = Array.from(el.querySelectorAll('.Zki2Ve')).map(e => e.innerText.trim());
            const numbers = numbersInEl.length > 0 ? numbersInEl : Array.from(document.querySelectorAll('.Zki2Ve')).map(e => e.innerText.trim());
            if (numbers.length > 1) {
                const min = parseInt(numbers[0]);
                const max = parseInt(numbers[numbers.length - 1]);
                for (let i = min; i <= max; i++) {
                    options.push(i.toString());
                }
            } else {
                options.push("Scale unavailable");
            }
        }

        questions.push({ name, question, type, options, hasOtherOptions });
    });

    return questions;
});