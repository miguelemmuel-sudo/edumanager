const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

// Insert after localStorage.setItem('edu_settings', JSON.stringify(window.EduSettings)); inside loadGlobalSettings
content = content.replace(
    "localStorage.setItem('edu_settings', JSON.stringify(window.EduSettings));\n    }",
    "localStorage.setItem('edu_settings', JSON.stringify(window.EduSettings));\n    }\n\n    // Mettre à jour tous les symboles de devise sur l'interface\n    const ccy = window.EduSettings.currency || 'FCFA';\n    document.querySelectorAll('.currency-symbol').forEach(el => {\n        el.textContent = ccy;\n    });"
);

// We should also patch the parameters updating in app.js !
content = content.replace(
    "if(document.getElementById('etab_pays')) document.getElementById('etab_pays').value = etabData.pays || '';",
    "if(document.getElementById('etab_pays')) document.getElementById('etab_pays').value = etabData.pays || '';\n        if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etabData.devise || 'FCFA';"
);

content = content.replace(
    "pays: document.getElementById('etab_pays').value.trim(),",
    "pays: document.getElementById('etab_pays').value.trim(),\n                devise: document.getElementById('etab_currency') ? document.getElementById('etab_currency').value.trim() : 'FCFA',"
);

// Also we need to remove the old getCurrencyByCountry !
// Oh actually we don't have to remove it, it won't be called if we use window.EduSettings.currency!

fs.writeFileSync('js/app.js', content);
console.log('App patched successfully!');
