const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

appjs = appjs.replace(
    /window\.deleteUser = async function\(id\) \{[\s\S]*?fetchAndRenderUtilisateurs\(\);\s*\}\s*\}/,
    \window.deleteUser = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer définitivement cet utilisateur ? (Action irréversible)")) {
        const { data, error } = await window.supabase.rpc('admin_delete_user', { p_user_id: id });
        if(error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else if (data && data.success === false) {
            if(window.showToast) window.showToast(data.error || "Erreur lors de la suppression", 'danger');
        } else {
            if(window.showToast) window.showToast('Utilisateur supprimé', 'success');
            fetchAndRenderUtilisateurs();
        }
    }
}\
);

fs.writeFileSync('js/app.js', appjs, 'utf8');
