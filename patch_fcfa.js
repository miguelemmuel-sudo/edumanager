const fs = require('fs');

function patchFile(filepath, replacements) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    for (let [oldStr, newStr] of replacements) {
        content = content.split(oldStr).join(newStr);
    }
    fs.writeFileSync(filepath, content);
    console.log(`Patched ${filepath}`);
}

patchFile('update_paiements_app.js', [
    ["+ ' FCFA'", "+ ' ' + (window.EduSettings?.currency || 'FCFA')"],
    ["FCFA</span></td>", "</span> <span class=\"currency-symbol\"></span></td>"]
]);

patchFile('update_rapports_app.js', [
    ["+ ' FCFA'", "+ ' ' + (window.EduSettings?.currency || 'FCFA')"]
]);

patchFile('dashboard/paiements.html', [
    ["(FCFA)", "(<span class=\"currency-symbol\">FCFA</span>)"],
    ["0 FCFA", "0 <span class=\"currency-symbol\">FCFA</span>"]
]);

patchFile('dashboard/parametres.html', [
    ["(FCFA)", "(<span class=\"currency-symbol\">FCFA</span>)"]
]);

patchFile('dashboard/eleves.html', [
    ["(FCFA)", "(<span class=\"currency-symbol\">FCFA</span>)"]
]);

console.log('All patches applied!');
