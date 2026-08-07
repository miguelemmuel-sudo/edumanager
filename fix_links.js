const fs = require('fs');
const path = require('path');

const dir = __dirname;

const routes = [
  '/dashboard/eleves',
  '/dashboard/enseignants',
  '/dashboard/classes',
  '/dashboard/notes',
  '/dashboard/emploi-du-temps',
  '/dashboard/paiements',
  '/dashboard/messages',
  '/dashboard/notifications',
  '/dashboard/utilisateurs',
  '/dashboard/rapports',
  '/dashboard/parametres',
  '/dashboard/profil',
  '/signin',
  '/signup',
  '/contact',
  '/a-propos',
  '/demo'
];

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const route of routes) {
        // Match href="route" and replace with href="route.html"
        const regex = new RegExp(`href="${route}"`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `href="${route}.html"`);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed links in ${fullPath}`);
      }
    }
  }
}

walk(dir);
console.log('Done!');
