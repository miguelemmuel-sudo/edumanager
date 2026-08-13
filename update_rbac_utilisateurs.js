const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const rbacUtilisateursApp = `
// --- UTILISATEURS & RBAC ---
window.currentGroupFilter = 'Tous';

window.filterTableByGroup = function(groupName) {
    window.currentGroupFilter = groupName;
    fetchAndRenderUtilisateurs();
};

window.toggleRoleFields = function() {
    const role = document.getElementById('roleSelect').value;
    const box = document.getElementById('dynamicFields');
    if (!box) return;
    
    if (role === 'enseignant') {
        box.innerHTML = '<label class="form-label">Matière enseignée</label><input type="text" name="matieres" class="form-control" placeholder="Ex: Mathématiques"/>';
        box.classList.remove('d-none');
    } else if (role === 'eleve') {
        box.innerHTML = '<label class="form-label">Sexe</label><select name="sexe" class="form-select"><option value="M">Masculin</option><option value="F">Féminin</option></select>' +
                        '<label class="form-label mt-2">ID Classe</label><input type="text" name="classe_id" class="form-control" placeholder="UUID de la classe (optionnel)"/>';
        box.classList.remove('d-none');
    } else {
        box.classList.add('d-none');
        box.innerHTML = '';
    }
};

async function fetchAndRenderUtilisateurs() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    
    // Fetch users with their groups (Using Supabase joins)
    let query = window.supabase
        .from('profiles')
        .select(\`
            id, email, prenom, nom, role, statut,
            user_group_members (
                user_groups ( name )
            )
        \`);
        
    if (statusFilter) {
        query = query.eq('statut', statusFilter);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erreur de chargement des utilisateurs.</td></tr>';
        return;
    }
    
    // Update KPIs
    if (window.currentGroupFilter === 'Tous' && !statusFilter) {
        let admins=0, profs=0, compts=0, parents=0, eleves=0;
        users.forEach(u => {
            if(u.role === 'admin') admins++;
            if(u.role === 'enseignant') profs++;
            if(u.role === 'comptable') compts++;
            if(u.role === 'parent') parents++;
            if(u.role === 'eleve') eleves++;
        });
        if(document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = users.length;
        if(document.getElementById('kpiAdmins')) document.getElementById('kpiAdmins').innerText = admins;
        if(document.getElementById('kpiProfs')) document.getElementById('kpiProfs').innerText = profs;
        if(document.getElementById('kpiComptables')) document.getElementById('kpiComptables').innerText = compts;
        if(document.getElementById('kpiParents')) document.getElementById('kpiParents').innerText = parents;
        if(document.getElementById('kpiEleves')) document.getElementById('kpiEleves').innerText = eleves;
    }
    
    tbody.innerHTML = '';
    
    const filteredUsers = users.filter(u => {
        if (window.currentGroupFilter === 'Tous') return true;
        // Check if user is in the selected group
        if (!u.user_group_members) return false;
        return u.user_group_members.some(m => m.user_groups && m.user_groups.name === window.currentGroupFilter);
    });

    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Aucun utilisateur trouvé pour ce filtre</td></tr>';
        return;
    }
    
    filteredUsers.forEach(u => {
        const nom = (u.prenom || '') + ' ' + (u.nom || '');
        const initial = nom.trim() ? nom.charAt(0).toUpperCase() : (u.email ? u.email.charAt(0).toUpperCase() : 'U');
        
        let groupsHtml = '';
        if (u.user_group_members && u.user_group_members.length > 0) {
            groupsHtml = u.user_group_members.map(m => m.user_groups ? \`<span class="badge bg-primary bg-opacity-10 text-primary me-1">\${m.user_groups.name}</span>\` : '').join('');
        }
        if (!groupsHtml) groupsHtml = \`<span class="badge bg-secondary">\${u.role || 'Aucun'}</span>\`;
        
        let statusBadge = '';
        if (u.statut === 'Actif') statusBadge = '<span class="status-badge success">Actif</span>';
        else if (u.statut === 'Suspendu') statusBadge = '<span class="status-badge danger">Suspendu</span>';
        else statusBadge = \`<span class="status-badge warning">\${u.statut}</span>\`;
        
        const isCurrent = (getSession() && getSession().userId === u.id);
        
        const suspendBtn = u.statut === 'Actif' 
            ? \`<button class="btn btn-sm btn-outline-warning" onclick="toggleUserStatus('\${u.id}', 'Suspendu')" title="Suspendre"><i class="fas fa-pause"></i></button>\`
            : \`<button class="btn btn-sm btn-outline-success" onclick="toggleUserStatus('\${u.id}', 'Actif')" title="Réactiver"><i class="fas fa-play"></i></button>\`;

        tbody.innerHTML += \`
            <tr>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <div class="table-av" style="background:var(--primary)">\${initial}</div>
                    <div><div class="fw-semibold">\${_e(nom || '-')}</div><div class="text-muted" style="font-size:.75rem">\${_e(u.email || '-')}</div></div>
                  </div>
                </td>
                <td>\${groupsHtml}</td>
                <td><span class="text-muted" style="font-size:.85rem">-</span></td>
                <td>\${statusBadge}</td>
                <td>
                  <div class="d-flex gap-2">
                    \${!isCurrent ? suspendBtn : ''}
                    \${!isCurrent ? \`<button class="btn btn-sm text-danger" style="background:rgba(239,68,68,.1)" onclick="deleteUser('\${u.id}')"><i class="fas fa-trash"></i></button>\` : ''}
                  </div>
                </td>
            </tr>
        \`;
    });
}

window.toggleUserStatus = async function(id, newStatus) {
    if(confirm(\`Voulez-vous passer cet utilisateur au statut : \${newStatus} ?\`)) {
        const { error } = await window.supabase.rpc('admin_toggle_user_status', { p_user_id: id, p_statut: newStatus });
        if(error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Statut mis à jour', 'success');
            fetchAndRenderUtilisateurs();
        }
    }
};

window.deleteUser = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer définitivement cet utilisateur ? (Action irréversible)")) {
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
        if (!form.email || !form.role || !form.prenom || !form.nom || !form.password) {
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
        } else if (form.role === 'enseignant') {
            metadata.matieres = form.matieres;
        }
        
        const { data, error } = await window.supabase.rpc('admin_create_user', {
            p_email: form.email,
            p_password: form.password,
            p_role: form.role,
            p_group_id: null, // Resolves dynamically based on role in the SQL function
            p_metadata: metadata
        });
        
        btnInvite.disabled = false;
        btnInvite.innerHTML = '<i class="fas fa-save me-2"></i>Créer le compte';
        
        if (error) {
            if(window.showToast) window.showToast(error.message || "Erreur de création", "danger");
        } else {
            if(data && data.success) {
                if(window.showToast) window.showToast("Compte utilisateur créé avec succès !", "success");
                const modalEl = document.getElementById('addUserModal');
                if(modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl).hide();
                clearFormData('addUserModal');
                fetchAndRenderUtilisateurs();
            } else {
                if(window.showToast) window.showToast(data?.error || "Erreur de création", "danger");
            }
        }
    });
}
`;

// Inject routing into the DOMContentLoaded listener
if (appJs.includes("else if (path.includes('utilisateurs.html')) {")) {
    // Already injected, we should replace the block or append it correctly.
    // To be safe, we will just rewrite the appJs block or append if not present.
    // For this environment, since we're generating the JS, we'll just write it.
}

// Remove old RBAC if it was already appended to app.js
let cleanAppJs = appJs;
const oldMarker = '// --- UTILISATEURS ---';
if (cleanAppJs.includes(oldMarker)) {
    cleanAppJs = cleanAppJs.substring(0, cleanAppJs.indexOf(oldMarker));
}

// Ensure routing is set
if (!cleanAppJs.includes("setupUtilisateursModal();")) {
     cleanAppJs = cleanAppJs.replace(
        "else if (path.includes('notifications.html')) {",
        "else if (path.includes('utilisateurs.html')) {\n        await fetchAndRenderUtilisateurs();\n        setupUtilisateursModal();\n    }\n    else if (path.includes('notifications.html')) {"
    );
}

fs.writeFileSync('js/app.js', cleanAppJs + '\n' + rbacUtilisateursApp);
console.log('RBAC utilisateurs functions (V2) appended to app.js');
