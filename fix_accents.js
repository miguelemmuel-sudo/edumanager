const fs = require('fs');
const path = require('path');

const replacements = {
  'é': 'é',
  'è': 'è',
  'ê': 'ê',
  'ë': 'ë',
  'Ã\xA0': 'à',
  'â': 'â',
  'ç': 'ç',
  'î': 'î',
  'ï': 'ï',
  'ô': 'ô',
  'ù': 'ù',
  'û': 'û',
  'É': 'É',
  'À': 'À',
  'Ç': 'Ç',
  'Ê': 'Ê',
  'È': 'È',
  'œ': 'œ',
  '€': '€',
  '’': '’',
  '–': '–',
  '«': '«',
  '»': '»'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(__dirname, function(filePath) {
  if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.json')) {
    if (filePath.includes('node_modules') || filePath.includes('.git')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (let [bad, good] of Object.entries(replacements)) {
      content = content.split(bad).join(good);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed:', filePath);
    }
  }
});
