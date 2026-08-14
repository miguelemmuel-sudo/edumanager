const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(/Param\?tres/g, 'Paramètres');
appjs = appjs.replace(/enregistr\?s/g, 'enregistrés');
appjs = appjs.replace(/succ\?s/g, 'succès');

fs.writeFileSync('js/app.js', appjs, 'utf8');
