const fs = require('fs');
let app = fs.readFileSync('update_profil_parametres_app.js', 'utf8');

app = app.replace(
    "if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etab.devise || 'FCFA';",
    "if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etab.currency || 'FCFA';"
);

app = app.replace(
    "const devise = document.getElementById('etab_currency') ? document.getElementById('etab_currency').value : 'FCFA';",
    "const currency = document.getElementById('etab_currency') ? document.getElementById('etab_currency').value : 'FCFA';"
);

app = app.replace(
    "nom, type, pays, ville, tel, devise",
    "nom, type, pays, ville, tel, currency"
);

fs.writeFileSync('update_profil_parametres_app.js', app);
console.log('Fixed update_profil_parametres_app.js');
