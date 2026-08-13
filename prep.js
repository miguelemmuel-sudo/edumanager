const fs = require('fs');
let rls = fs.readFileSync('update_rls.sql', 'utf8');
let auth = fs.readFileSync('setup_auth.sql', 'utf8');
let rbac = fs.readFileSync('rbac_functions.sql', 'utf8');
let query = rls + '\n' + auth + '\n' + rbac;
fs.writeFileSync('query.json', JSON.stringify({ project_id: 'ouraqvirmashzzstkqfx', query: query }));
