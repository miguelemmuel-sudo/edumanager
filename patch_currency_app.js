const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

// Replace 1: loadGlobalSettings (first occurrence)
content = content.replace(
    "systeme: etabData.systeme_educatif || 'Francophone',",
    "systeme: etabData.systeme_educatif || 'Francophone',\n            currency: etabData.devise || 'FCFA',"
);

content = content.replace(
    "systeme: 'Francophone', logo_url: null };",
    "systeme: 'Francophone', currency: 'FCFA', logo_url: null };"
);

fs.writeFileSync('js/app.js', content);
console.log('Done!');
