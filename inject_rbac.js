const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, 'dashboard');
const files = fs.readdirSync(dashboardDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(dashboardDir, file), 'utf8');
    
    // Inject scripts before </body>
    if (!content.includes('security.js')) {
        content = content.replace('</body>', '  <script src="../js/security.js"></script>\n  <script src="../js/sidebar.js"></script>\n</body>');
    }
    
    // Empty out the static sidebar content but keep the wrapper
    // We'll replace everything inside <aside class="sidebar" id="sidebar"> up to </aside> with an empty aside
    // Wait, regex might fail with nested tags. Let's do a simple regex since sidebar is well structured
    content = content.replace(/<aside class="sidebar" id="sidebar">[\s\S]*?<\/aside>/, '<aside class="sidebar" id="sidebar"></aside>');
    
    fs.writeFileSync(path.join(dashboardDir, file), content);
    console.log('Injected RBAC scripts into ' + file);
});
