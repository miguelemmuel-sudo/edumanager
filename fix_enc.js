const fs = require('fs');

function fixEncoding(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Convert the messed up UTF-8 back to a buffer using latin1 (which preserves the raw bytes)
    // then decode it as utf8
    try {
        let fixed = Buffer.from(content, 'latin1').toString('utf8');
        // Only write if it actually had double-encoded characters and successfully decoded
        if (fixed.includes('é') || fixed.includes('è') || fixed.includes('É')) {
             fs.writeFileSync(filePath, fixed, 'utf8');
             console.log('Fixed ' + filePath);
        } else {
             console.log('No obvious fix needed for ' + filePath + ' or it was already correct');
        }
    } catch(e) {
        console.error('Failed to fix ' + filePath, e);
    }
}

fixEncoding('dashboard/utilisateurs.html');
fixEncoding('js/app.js');
