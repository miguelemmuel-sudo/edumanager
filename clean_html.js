const fs = require('fs');

function cleanHTML(filePath) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');
    const scriptStart = html.lastIndexOf('<script>');
    if (scriptStart !== -1) {
        html = html.substring(0, scriptStart) + '<script src="/js/vendor/bootstrap.bundle.min.js"></script>\n<script src="../js/dashboard.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="../js/config.js"></script>\n<script src="../js/supabase.js"></script>\n<script src="../js/app.js"></script>\n</body>\n</html>';
        fs.writeFileSync(filePath, html);
        console.log('Cleaned ' + filePath);
    } else {
        console.log('Marker not found in ' + filePath);
    }
}

cleanHTML('dashboard/classes.html');
