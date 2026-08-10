const fs = require('fs');
const file = 'dashboard/enseignants.html';
let c = fs.readFileSync(file, 'utf8');

const startStr = '<div class="row g-3" id="ensBody">';
const endStr = '<!-- Vue Tableau -->';
const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = c.substring(0, startIndex + startStr.length) + '\n    <!-- Données dynamiques insérées ici -->\n  </div>\n</div>\n\n' + c.substring(endIndex);
  fs.writeFileSync(file, newContent);
  console.log('Replaced successfully');
} else {
  console.log('Could not find tags');
}
