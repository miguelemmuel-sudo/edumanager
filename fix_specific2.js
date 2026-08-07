const fs = require('fs');
const path = require('path');

const replacements = {
  '⭐': '⭐',
  '⚠️': '⚠️',
  '😊': '😊'
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
console.log('Second pass finished.');
