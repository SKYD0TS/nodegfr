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