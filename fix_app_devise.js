const fs = require('fs');
let app = fs.readFileSync('js/app.js', 'utf8');

// 1. In initEtablissementSettings (around line 2871)
app = app.replace(
    "currency: etabData.devise || 'FCFA',",
    "currency: etabData.currency || 'FCFA',"
);

// 2. In setupProfilParametres (around line 3470) -- Actually this function was removed or moved?
// Let's check if it exists:
app = app.replace(
    "if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etab.devise || 'FCFA';",
    "if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etab.currency || 'FCFA';"
);

// 3. In the update call
app = app.replace(
    "devise: document.getElementById('etab_currency') ? document.getElementById('etab_currency').value.trim() : 'FCFA',",
    "currency: document.getElementById('etab_currency') ? document.getElementById('etab_currency').value.trim() : 'FCFA',"
);

fs.writeFileSync('js/app.js', app);
console.log('Fixed app.js');
