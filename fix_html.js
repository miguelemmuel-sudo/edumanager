const fs = require('fs');
let html = fs.readFileSync('dashboard/utilisateurs.html', 'utf8');

html = html.replace(/\uFFFD0l\uFFFDves/g, 'Élèves');
html = html.replace(/\?0l\uFFFDves/g, 'Élèves');
html = html.replace(/Cr\uFFFDer/g, 'Créer');
html = html.replace(/Pr\uFFFDnom/g, 'Prénom');
html = html.replace(/T\uFFFDl\uFFFDphone/g, 'Téléphone');
html = html.replace(/R\uFFFDe/g, 'Rôle');
html = html.replace(/r\uFFFDe/g, 'rôle');
html = html.replace(/D\uFFFDfinit/g, 'Définit');
html = html.replace(/d\uFFFDfinit/g, 'définit');
html = html.replace(/G\uFFFDn\uFFFDrer/g, 'Générer');
html = html.replace(/S\uFFFDelectionner/g, 'Sélectionner');
html = html.replace(/DERNI\uFFFDRE/g, 'DERNIÈRE');
html = html.replace(/R\uFFFDLE/g, 'RÔLE');
html = html.replace(/Cr\uFFFDeation/g, 'Création');

// Fallback manual checks for what powershell output showed:
html = html.replace(/\?0lves/g, 'Élèves');
html = html.replace(/Crer/g, 'Créer');
html = html.replace(/Prnom/g, 'Prénom');
html = html.replace(/Tlphone/g, 'Téléphone');

fs.writeFileSync('dashboard/utilisateurs.html', html, 'utf8');
