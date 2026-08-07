const fs = require('fs');
const path = require('path');

const replacements = {
  '—': '—',
  '–': '–',
  '…': '…',
  '👋': '👋',
  '→': '→',
  '⭐': '⭐',
  '•': '•',
  '⚠️': '⚠️',
  '📚': '📚',
  '💳': '💳',
  '📢': '📢',
  '📋': '📋',
  '✅': '✅',
  'é': 'é',
  'è': 'è',
  'ç': 'ç',
  'à': 'à',
  'â': 'â',
  'ê': 'ê',
  'î': 'î',
  'ô': 'ô',
  'û': 'û',
  'ï': 'ï',
  'ë': 'ë',
  'ü': 'ü',
  'Ü': 'Ü',
  'É': 'É',
  'È': 'È',
  'Ç': 'Ç',
  'À': 'À',
  '°': '°',
  '€': '€',
  '€': '€',
  '’': '’',
  '': '' // Remove stray non-breaking space prefixes
};

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.git')) {
        walkDir(dirPath);
      }
    } else if (f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.json')) {
      let content = fs.readFileSync(dirPath, 'utf8');
      let original = content;
      
      for (let [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      
      if (content !== original) {
        fs.writeFileSync(dirPath, content, 'utf8');
        console.log('Fixed:', dirPath);
      }
    }
  });
}

walkDir(__dirname);
console.log('All remaining mojibake fixed.');
