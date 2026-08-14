const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(
    /const \{ data, error \} = await window\.supabase\.rpc\('admin_create_user', \{\s*p_email: form\.email,\s*p_password: form\.password,\s*p_role: form\.role,\s*p_metadata: metadata\s*\}\);/g,
    \const { data, error } = await window.supabase.rpc('admin_create_user', {
            p_email: form.email,
            p_password: form.password,
            p_role: form.role,
            p_group_id: null,
            p_metadata: metadata
        });\
);

fs.writeFileSync('js/app.js', appjs, 'utf8');
