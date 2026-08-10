// --- GENERIC HELPERS ---
function getFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return {};
    const inputs = modal.querySelectorAll('input[name], select[name], textarea[name]');
    const data = {};
    inputs.forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') {
            if (i.checked) data[i.name] = i.value;
        } else {
            data[i.name] = i.value.trim();
        }
    });
    return data;
}

function clearFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input[name], select[name], textarea[name]').forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
        else if (i.tagName === 'SELECT') i.selectedIndex = 0;
        else i.value = '';
    });
}
