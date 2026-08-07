const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dashboard');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  const scripts = `
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/config.js"></script>
<script src="../js/supabase.js"></script>
<script src="../js/app.js">`;

  content = content.replace(/<script src="\.\.\/js\/app\.js">/g, scripts);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Injected Supabase scripts in', file);
  }
}
