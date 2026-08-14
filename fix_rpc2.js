const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(
    /const \{ data, error \} = await window\.supabase\.rpc\('admin_create_user', \{\s*p_email: form\.email,\s*p_password: form\.password,\s*p_role: form\.role,\s*p_metadata: metadata\s*\}\);/g,
    "const { data, error } = await window.supabase.rpc('admin_create_user', {\n            p_email: form.email,\n            p_password: form.password,\n            p_role: form.role,\n            p_group_id: null,\n            p_metadata: metadata\n        });"
);

fs.writeFileSync('js/app.js', appjs, 'utf8');
