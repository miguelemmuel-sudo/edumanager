const fs = require('fs');
const path = require('path');

const win1252 = {
  0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192,
  0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039,
  0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D, 0x8F: 0x008F,
  0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9D: 0x009D, 0x9E: 0x017E, 0x9F: 0x0178
};

function getMojibake(realStr) {
  const buf = Buffer.from(realStr, 'utf8');
  let result = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 0x80 && b <= 0x9F) {
      result += String.fromCharCode(win1252[b]);
    } else {
      result += String.fromCharCode(b);
    }
  }
  return result;
}

const symbols = [
  '👋', '—', '–', '…', '→', '⭐', '•', '⚠️', '📚', '💳', '📢', '📋', '✅'
];

const replacements = {};
symbols.forEach(s => {
  replacements[getMojibake(s)] = s;
});

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
console.log('Robust pass finished.');
