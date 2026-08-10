const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const utilisateursCRUD = `
// --- UTILISATEURS ---
async function fetchAndRenderUtilisateurs() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;

    // Fetch the current admin profile
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;
    
    // We only show the admin for now since other users require Edge Functions to be created
    let html = \`
      <tr>
        <td>
            <div class="d-flex align-items-center gap-2">
                <div class="table-av" style="background:var(--primary)">A</div>
                <div>
                    <div style="font-weight:600;font-size:.85rem">\${_e(user.user_metadata?.prenom || 'Admin')} \${_e(user.user_metadata?.nom || '')}</div>
                    <div style="font-size:.75rem;color:var(--muted)">\${_e(user.email)}</div>
                </div>
            </div>
        </td>
        <td><span class="status-badge danger">Administrateur</span></td>
        <td style="font-size:.82rem">En ligne</td>
        <td><span class="status-badge success">Actif</span></td>
        <td></td>
      </tr>
    \`;

    // Add local invites
    const invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
    invites.forEach(inv => {
        let roleText = 'Enseignant';
        let roleClass = 'success';
        if (inv.role === 'admin') { roleText = 'Administrateur'; roleClass = 'danger'; }
        else if (inv.role === 'gestionnaire') { roleText = 'Gestionnaire'; roleClass = 'primary'; }
        
        html += \`
          <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="table-av" style="background:var(--muted)">\${inv.email.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;font-size:.85rem">En attente...</div>
                        <div style="font-size:.75rem;color:var(--muted)">\${_e(inv.email)}</div>
                    </div>
                </div>
            </td>
            <td><span class="status-badge \${roleClass}">\${roleText}</span></td>
            <td style="font-size:.82rem">Jamais</td>
            <td><span class="status-badge text-dark border bg-light"><i class="fas fa-clock me-1 text-warning"></i>Invitation envoyée</span></td>
            <td><button class="btn btn-sm text-danger" onclick="deleteInvite('\${inv.email}')"><i class="fas fa-times"></i></button></td>
          </tr>
        \`;
    });
    
    tbody.innerHTML = html;
}

window.showRoleInfo = function() {
    const roleDesc = {
        admin: '⚠️ Accès complet à toutes les fonctionnalités de la plateforme, y compris la gestion des utilisateurs et des paramètres.',
        enseignant: '📚 Accès à ses classes, saisie des notes, emploi du temps et messagerie. Pas d\\'accès aux finances.',
        gestionnaire: '💳 Gestion des paiements, inscriptions et rapports financiers. Pas d\\'accès à la gestion des utilisateurs.'
    };
    const v = document.getElementById('roleSelect').value;
    const box = document.getElementById('roleInfoBox');
    if (!box) return;
    if (v && roleDesc[v]) { box.innerHTML = roleDesc[v]; box.classList.remove('d-none'); }
    else box.classList.add('d-none');
}

function setupUtilisateursModal() {
    const btnInvite = document.getElementById('btnInviteUser');
    if (!btnInvite) return;
    
    btnInvite.addEventListener('click', () => {
        const form = getFormData('formInviteUser');
        if (!form.email || !form.role) {
            if(window.showToast) window.showToast("Veuillez remplir l'email et le rôle", "warning");
            return;
        }
        
        let invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
        if (invites.find(i => i.email === form.email)) {
            if(window.showToast) window.showToast("Cet utilisateur a déjà été invité", "warning");
            return;
        }
        
        invites.push({ email: form.email, role: form.role, date: new Date().toISOString() });
        localStorage.setItem('edu_users_invites', JSON.stringify(invites));
        
        if(window.showToast) window.showToast("Invitation envoyée avec succès !", "success");
        
        bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
        clearFormData('addUserModal');
        
        fetchAndRenderUtilisateurs();
    });
}

window.deleteInvite = function(email) {
    if(!confirm("Annuler l'invitation ?")) return;
    let invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
    invites = invites.filter(i => i.email !== email);
    localStorage.setItem('edu_users_invites', JSON.stringify(invites));
    fetchAndRenderUtilisateurs();
}
`;

const startIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + utilisateursCRUD + '\n\n' + appJs.substring(startIdx);
    
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderUtilisateurs();\n    setupUtilisateursModal();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Utilisateurs CRUD logic injected');
} else {
    console.log('Markers not found');
}
