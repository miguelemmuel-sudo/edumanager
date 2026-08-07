const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dashboard');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Insert app.js right before </body> if not already there
  if (!content.includes('app.js')) {
    content = content.replace(/<\/body>/, '<script src="../js/app.js"></script>\n</body>');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Injected app.js in', file);
  }
}
