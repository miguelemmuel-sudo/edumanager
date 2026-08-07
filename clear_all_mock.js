const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dashboard');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clear KPIs (value)
  content = content.replace(/<div class="sc-value">[^<]+<\/div>/g, '<div class="sc-value">0</div>');
  content = content.replace(/<div class="fw-bold text-[^"]+" style="font-size:11px">[^<]+<\/div>/g, (match) => {
    return match.replace(/>[^<]+</, '>0<');
  });
  
  // Empty tbodys without id
  content = content.replace(/<tbody([^>]*)>([\s\S]*?)<\/tbody>/g, (match, p1) => {
    let idMatch = p1.match(/id="([^"]+)"/);
    let id = idMatch ? idMatch[1] : 'dynamicBody';
    if (!idMatch) {
      p1 = p1 + ' id="dynamicBody"';
    }
    return `<tbody${p1}>\n          <!-- Données dynamiques -->\n        </tbody>`;
  });

  // Specifically for classes.html grid
  if (file === 'classes.html') {
    content = content.replace(/<!-- Grille classes par niveau -->([\s\S]*?)<!-- Modal/g, '<!-- Grille classes par niveau -->\n  <div id="classesContainer">\n    <!-- Données dynamiques -->\n  </div>\n\n  <!-- Modal');
  }

  // Specifically for index.html charts and lists
  if (file === 'index.html') {
    content = content.replace(/<div class="hd-tr d-flex justify-content-between py-1 border-bottom"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '<!-- Liste dynamique -->\n                </div>\n              </div>\n            </div>');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleared mock data in', file);
  }
}
