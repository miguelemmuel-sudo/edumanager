const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(/Cration/g, 'Création');
appjs = appjs.replace(/Crer/g, 'Créer');
appjs = appjs.replace(/cr/g, 'cré');
appjs = appjs.replace(/cration/g, 'création');
appjs = appjs.replace(/succs/g, 'succès');
appjs = appjs.replace(/lve/g, 'élève');
appjs = appjs.replace(/lves/g, 'élèves');
appjs = appjs.replace(/Param\?tres/g, 'Paramètres');
appjs = appjs.replace(/enregistr\?s/g, 'enregistrés');
appjs = appjs.replace(/succ\?s/g, 'succès');

fs.writeFileSync('js/app.js', appjs, 'utf8');
