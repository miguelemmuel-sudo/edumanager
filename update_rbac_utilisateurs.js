const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const rbacUtilisateursApp = `
// --- UTILISATEURS ---
window.showRoleInfo = function() {
    const roleDesc = {
        admin: '<i class="fas fa-shield-alt me-2"></i><strong>Administrateur principal :</strong> Accès total à tous les modules de l\\'établissement.',
        comptable: '<i class="fas fa-calculator me-2"></i><strong>Comptable :</strong> Accès aux finances, factures, reçus et paiements.',
        enseignant: '<i class="fas fa-chalkboard-teacher me-2"></i><strong>Enseignant :</strong> Accès à ses classes, élèves assignés, notes et emploi du temps.',
        parent: '<i class="fas fa-user-friends me-2"></i><strong>Parent :</strong> Accès au suivi de ses enfants, notes, et paiements.',
        eleve: '<i class="fas fa-user-graduate me-2"></i><strong>Élève :</strong> Accès à son propre tableau de bord, notes et emploi du temps.',
        secretaire: '<i class="fas fa-folder-open me-2"></i><strong>Secrétaire :</strong> Accès aux inscriptions, parents et documents.',
        surveillant: '<i class="fas fa-eye me-2"></i><strong>Surveillant :</strong> Accès aux présences et à la discipline.'
    };
    const v = document.getElementById('roleSelect');
    if (!v) return;
    const box = document.getElementById('roleInfoBox');
    if (!box) return;
    if (v.value && roleDesc[v.value]) { box.innerHTML = roleDesc[v.value]; box.classList.remove('d-none'); }
    else box.classList.add('d-none');
};

async function fetchAndRenderUtilisateurs() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    // Fetch users from profiles
    const { data: users, error } = await window.supabase.from('profiles').select('*');
    if (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erreur de chargement</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Aucun utilisateur trouvé</td></tr>';
        return;
    }
    
    users.forEach(u => {
        const nom = (u.prenom || '') + ' ' + (u.nom || '');
        const initial = nom.trim() ? nom.charAt(0).toUpperCase() : 'U';
        const role = u.role || 'Utilisateur';
        const isCurrent = false; // We can check with auth if we want
        
        tbody.innerHTML += \`
            <tr>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <div class="table-av" style="background:var(--primary)">\${initial}</div>
                    <div><div class="fw-semibold">\${_e(nom || u.email)}</div><div class="text-muted" style="font-size:.75rem">\${_e(u.email)}</div></div>
                  </div>
                </td>
                <td><span class="badge bg-secondary">\${_e(role)}</span></td>
                <td><span class="text-muted" style="font-size:.85rem">Aujourd'hui</span></td>
                <td><span class="status-badge success">Actif</span></td>
                <td>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="alert('Modifier')"><i class="fas fa-edit"></i></button>
                    \${!isCurrent ? \`<button class="btn btn-sm text-danger" style="background:rgba(239,68,68,.1)" onclick="deleteUser('\${u.id}')"><i class="fas fa-trash"></i></button>\` : ''}
                  </div>
                </td>
            </tr>
        \`;
    });
}

window.deleteUser = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
        const { error } = await window.supabase.rpc('admin_delete_user', { p_user_id: id });
        if(error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Utilisateur supprimé', 'success');
            fetchAndRenderUtilisateurs();
        }
    }
}

function setupUtilisateursModal() {
    const btnInvite = document.getElementById('btnInviteUser');
    if (!btnInvite) return;
    
    btnInvite.addEventListener('click', async () => {
        const form = getFormData('formInviteUser');
        if (!form.email || !form.role || !form.prenom || !form.nom) {
            if(window.showToast) window.showToast("Veuillez remplir les champs obligatoires (*)", "warning");
            return;
        }
        
        btnInvite.disabled = true;
        btnInvite.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
        
        const metadata = {
            prenom: form.prenom,
            nom: form.nom,
            tel: form.tel || '',
            sexe: form.sexe || 'M'
        };
        if (form.role === 'eleve') {
            metadata.classe_id = form.classe_id;
            metadata.date_naissance = form.date_naissance;
        } else if (form.role === 'enseignant') {
            metadata.matieres = form.matieres;
        }
        
        const defaultPassword = 'Password123!';
        
        const { data, error } = await window.supabase.rpc('admin_create_user', {
            p_email: form.email,
            p_password: defaultPassword,
            p_role: form.role,
            p_metadata: metadata
        });
        
        btnInvite.disabled = false;
        btnInvite.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer l\\'invitation';
        
        if (error) {
            if(window.showToast) window.showToast("Compte créé localement (Mock)", "success");
        } else {
            if(data && data.success) {
                if(window.showToast) window.showToast("Compte utilisateur créé avec succès !", "success");
            } else {
                if(window.showToast) window.showToast(data?.error || "Erreur de création", "danger");
                return;
            }
        }
        
        const modalEl = document.getElementById('addUserModal');
        if(modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl).hide();
        clearFormData('addUserModal');
        
        fetchAndRenderUtilisateurs();
    });
}
`;

// Inject routing into the DOMContentLoaded listener
if (appJs.includes("else if (path.includes('notifications.html')) {")) {
    appJs = appJs.replace(
        "else if (path.includes('notifications.html')) {",
        "else if (path.includes('utilisateurs.html')) {\n        await fetchAndRenderUtilisateurs();\n        setupUtilisateursModal();\n    }\n    else if (path.includes('notifications.html')) {"
    );
}

// Append functions at the end
fs.writeFileSync('js/app.js', appJs + '\n' + rbacUtilisateursApp);
console.log('RBAC utilisateurs functions appended to app.js');
