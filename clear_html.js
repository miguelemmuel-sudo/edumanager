const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dashboard');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clear tbodys (keep the id but empty content)
  content = content.replace(/<tbody id="([^"]+)">([\s\S]*?)<\/tbody>/g, '<tbody id="$1">\n          <!-- Données dynamiques insérées ici -->\n        </tbody>');
  
  // Clear messagesList
  content = content.replace(/<div class="list-group list-group-flush" id="messagesList">([\s\S]*?)<\/div>/g, '<div class="list-group list-group-flush" id="messagesList">\n          <!-- Messages dynamiques -->\n        </div>');

  // Clear notifList
  content = content.replace(/<div class="list-group list-group-flush" id="notifList">([\s\S]*?)<\/div>/g, '<div class="list-group list-group-flush" id="notifList">\n          <!-- Notifications dynamiques -->\n        </div>');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleared mock data in', file);
  }
}
