const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

const targetStr = \window.deleteUser = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer définitivement cet utilisateur ? (Action irréversible)")) {
        const { error } = await window.supabase.rpc('admin_delete_user', { p_user_id: id });
        if(error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Utilisateur supprimé', 'success');
            fetchAndRenderUtilisateurs();
        }
    }
}\;

const replacement = \window.deleteUser = async function(id) {
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
}\;

appjs = appjs.replace(targetStr, replacement);
fs.writeFileSync('js/app.js', appjs, 'utf8');
