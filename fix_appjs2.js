const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(/\uFFFDl\uFFFDve/g, 'élève');
appjs = appjs.replace(/\uFFFDl\uFFFDves/g, 'élèves');
appjs = appjs.replace(/Cr\uFFFDer/g, 'Créer');
appjs = appjs.replace(/Cr\uFFFDeation/g, 'Création');
appjs = appjs.replace(/cr\uFFFD/g, 'créé');
appjs = appjs.replace(/succ\uFFFDs/g, 'succès');
appjs = appjs.replace(/Param\uFFFDtres/g, 'Paramètres');
appjs = appjs.replace(/enregistr\uFFFDs/g, 'enregistrés');
appjs = appjs.replace(/Mati\uFFFDre/g, 'Matière');
appjs = appjs.replace(/enseign\uFFFD/g, 'enseigné');
appjs = appjs.replace(/D\uFFFDfinit/g, 'Définit');
appjs = appjs.replace(/g\uFFFDn\uFFFDr\uFFFDer/g, 'générer');
appjs = appjs.replace(/Cr\uFFFDation/g, 'Création');
appjs = appjs.replace(/S\uFFFDelectionner/g, 'Sélectionner');
appjs = appjs.replace(/d\uFFFDfinit/g, 'définit');

fs.writeFileSync('js/app.js', appjs, 'utf8');
