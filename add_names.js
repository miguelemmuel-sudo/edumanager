const fs = require('fs');

let classesHtml = fs.readFileSync('dashboard/classes.html', 'utf8');
classesHtml = classesHtml.replace(/<input type="text" class="form-control" placeholder="Nom de la classe"/g, '<input type="text" name="nom" class="form-control" placeholder="Nom de la classe"');
classesHtml = classesHtml.replace(/<select class="form-select"><option>6ème/g, '<select name="niveau" class="form-select"><option>6ème');
classesHtml = classesHtml.replace(/<input type="text" class="form-control" placeholder="Ex: B21"/g, '<input type="text" name="salle" class="form-control" placeholder="Ex: B21"');
classesHtml = classesHtml.replace(/<input type="number" class="form-control" placeholder="48"/g, '<input type="number" name="capacite" class="form-control" placeholder="48"');
classesHtml = classesHtml.replace(/<select class="form-select"><option>Aucun<\/option><option>M. Diallo/g, '<select name="prof_principal_id" class="form-select" id="profSelect"><option value="">Aucun</option><option>M. Diallo');
fs.writeFileSync('dashboard/classes.html', classesHtml);

let ensHtml = fs.readFileSync('dashboard/enseignants.html', 'utf8');
ensHtml = ensHtml.replace(/<input type="text" class="form-control" placeholder="Prénom"/g, '<input type="text" name="prenom" class="form-control" placeholder="Prénom"');
ensHtml = ensHtml.replace(/<input type="text" class="form-control" placeholder="Nom"/g, '<input type="text" name="nom" class="form-control" placeholder="Nom"');
ensHtml = ensHtml.replace(/<select class="form-select"><option>Masculin<\/option><option>Féminin<\/option><\/select>/g, '<select name="sexe" class="form-select"><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select>');
ensHtml = ensHtml.replace(/<input type="email" class="form-control" placeholder="ens@ecole.ci"/g, '<input type="email" name="email" class="form-control" placeholder="ens@ecole.ci"');
ensHtml = ensHtml.replace(/<input type="tel" class="form-control" placeholder="07 00 00 00"/g, '<input type="tel" name="tel" class="form-control" placeholder="07 00 00 00"');
ensHtml = ensHtml.replace(/<select class="form-select"><option>Mathématiques/g, '<select name="matiere" class="form-select"><option value="Mathématiques">Mathématiques');
fs.writeFileSync('dashboard/enseignants.html', ensHtml);

let elevesHtml = fs.readFileSync('dashboard/eleves.html', 'utf8');
elevesHtml = elevesHtml.replace(/<input type="text" class="form-control" placeholder="Prénom"/g, '<input type="text" name="prenom" class="form-control" placeholder="Prénom"');
elevesHtml = elevesHtml.replace(/<input type="text" class="form-control" placeholder="Nom"/g, '<input type="text" name="nom" class="form-control" placeholder="Nom"');
elevesHtml = elevesHtml.replace(/<select class="form-select"><option>6ème A/g, '<select name="classe_id" id="classeSelect" class="form-select"><option>6ème A');
elevesHtml = elevesHtml.replace(/<input type="date" class="form-control"/g, '<input type="date" name="date_naissance" class="form-control"');
elevesHtml = elevesHtml.replace(/<select class="form-select"><option>Masculin/g, '<select name="sexe" class="form-select"><option value="Masculin">Masculin');
elevesHtml = elevesHtml.replace(/<input type="text" class="form-control" placeholder="Ex: Ivoirienne"/g, '<input type="text" name="nationalite" class="form-control" placeholder="Ex: Ivoirienne"');
elevesHtml = elevesHtml.replace(/<input type="text" class="form-control" placeholder="Adresse complète"/g, '<input type="text" name="adresse" class="form-control" placeholder="Adresse complète"');
elevesHtml = elevesHtml.replace(/<input type="text" class="form-control" placeholder="Nom complet"/g, '<input type="text" name="parent_nom" class="form-control" placeholder="Nom complet"');
elevesHtml = elevesHtml.replace(/<input type="tel" class="form-control" placeholder="\+225 07 00 00 00"/g, '<input type="tel" name="parent_tel" class="form-control" placeholder="+225 07 00 00 00"');
elevesHtml = elevesHtml.replace(/<input type="email" class="form-control" placeholder="parent@email.com"/g, '<input type="email" name="parent_email" class="form-control" placeholder="parent@email.com"');
fs.writeFileSync('dashboard/eleves.html', elevesHtml);

console.log('Added name attributes');
