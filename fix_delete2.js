const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(
    /window\.deleteUser = async function\(id\) \{[\s\S]*?fetchAndRenderUtilisateurs\(\);\s*\}\s*\}/,
    "window.deleteUser = async function(id) {\n    if(confirm(\"Voulez-vous vraiment supprimer définitivement cet utilisateur ? (Action irréversible)\")) {\n        const { data, error } = await window.supabase.rpc('admin_delete_user', { p_user_id: id });\n        if(error) {\n            if(window.showToast) window.showToast(error.message, 'danger');\n        } else if (data && data.success === false) {\n            if(window.showToast) window.showToast(data.error || \"Erreur lors de la suppression\", 'danger');\n        } else {\n            if(window.showToast) window.showToast('Utilisateur supprimé', 'success');\n            fetchAndRenderUtilisateurs();\n        }\n    }\n}"
);

fs.writeFileSync('js/app.js', appjs, 'utf8');
