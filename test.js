const fs = require('fs');
console.log('Checking app.js syntax...');
try {
    const code = fs.readFileSync('js/app.js', 'utf8');
    new Function(code);
    console.log('No syntax error');
} catch (e) {
    console.error('Syntax error:', e);
}
