const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, 'dashboard');
const indexContent = fs.readFileSync(path.join(dashboardDir, 'index.html'), 'utf8');

// ENSEIGNANT DASHBOARD
let enseignantContent = indexContent
    .replace('Bonjour, Directeur', 'Bonjour, Enseignant')
    .replace("voici un aperçu de votre établissement aujourd'hui", "voici un aperçu de vos classes aujourd'hui");

fs.writeFileSync(path.join(dashboardDir, 'enseignant.html'), enseignantContent);

// PARENT DASHBOARD
let parentContent = indexContent
    .replace('Bonjour, Directeur', 'Bonjour, Parent')
    .replace("voici un aperçu de votre établissement aujourd'hui", "voici le suivi de vos enfants");
fs.writeFileSync(path.join(dashboardDir, 'parent.html'), parentContent);

// ELEVE DASHBOARD
let eleveContent = indexContent
    .replace('Bonjour, Directeur', 'Bonjour, Élève')
    .replace("voici un aperçu de votre établissement aujourd'hui", "voici ton tableau de bord");
fs.writeFileSync(path.join(dashboardDir, 'eleve.html'), eleveContent);

console.log('Created enseignant.html, parent.html, eleve.html');
