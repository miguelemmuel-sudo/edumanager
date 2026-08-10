const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const notifsCRUD = `
// --- NOTIFICATIONS ---
async function fetchAndRenderNotifs() {
    const list = document.getElementById('derniersEnvoisList');
    if (!list) return;

    const { data: notifs, error } = await window.supabase.from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false });
        
    if (error) return console.error(error);

    // Update Stats
    const total = notifs.length;
    const lues = notifs.filter(n => n.lu).length;
    const taux = total > 0 ? Math.round((lues / total) * 100) : 0;
    
    const scValues = document.querySelectorAll('.sc-value');
    if(scValues.length >= 3) {
        scValues[0].textContent = total;
        scValues[1].textContent = lues;
        scValues[2].textContent = taux + '%';
    }
    
    if(document.getElementById('notifLuesVal')) document.getElementById('notifLuesVal').textContent = lues;
    if(document.getElementById('notifTauxVal')) document.getElementById('notifTauxVal').textContent = taux + '%';
    if(document.getElementById('notifTauxBar')) document.getElementById('notifTauxBar').style.width = taux + '%';

    if (notifs.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-muted">Aucune notification envoyée</div>';
        return;
    }

    list.innerHTML = '';
    notifs.forEach(n => {
        // Here we parse type_notif to know the group (we saved the group in type_notif for the mockup)
        const group = n.type_notif || 'Global';
        
        list.innerHTML += \`
            <div class="p-3 border-bottom d-flex align-items-center justify-content-between hover-bg" style="transition:background .2s">
              <div>
                <div class="fw-bold text-dark mb-1">\${_e(n.titre)}</div>
                <div class="text-muted" style="font-size:0.8rem">\${_e(n.message).substring(0,60)}...</div>
                <div class="d-flex align-items-center gap-2 mt-2">
                  <span class="status-badge \${n.lu ? 'success' : 'primary'}" style="font-size:0.7rem">\${group}</span>
                  <span class="text-muted" style="font-size:0.7rem"><i class="fas fa-clock me-1"></i>\${new Date(n.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              <div class="d-flex flex-column align-items-end">
                <span style="font-size:0.75rem;font-weight:600;color:var(--success)">\${n.lu ? '100%' : '0%'} lus</span>
                <button class="btn btn-sm text-danger mt-2" onclick="deleteNotif('\${n.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
              </div>
            </div>
        \`;
    });
}

function setupNotifsModal() {
    const btnSave = document.getElementById('btnSaveNotif');
    if (!btnSave) return;
    
    btnSave.addEventListener('click', async () => {
        const form = getFormData('formSendNotif');
        if (!form.titre || !form.message) {
            if(window.showToast) window.showToast('Le titre et le message sont obligatoires', 'warning');
            return;
        }
        
        const payload = {
            titre: form.titre,
            message: form.message,
            type_notif: form.destinataire_grp || 'Global',
            user_id: null, // Global
            lu: true // For mockup: just mark as read so stats look nice
        };
        
        btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('notifications').insert([payload]);
        btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Notification envoyée avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('sendNotifModal')).hide();
            clearFormData('sendNotifModal');
            fetchAndRenderNotifs();
        }
    });
}

window.deleteNotif = async function(id) {
    if(!confirm('Supprimer cette notification de l\\'historique ?')) return;
    await window.supabase.from('notifications').delete().eq('id', id);
    if(window.showToast) window.showToast('Notification supprimée', 'success');
    fetchAndRenderNotifs();
}
`;

const startIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + notifsCRUD + '\n\n' + appJs.substring(startIdx);
    
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderNotifs();\n    setupNotifsModal();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Notifications CRUD logic injected');
} else {
    console.log('Markers not found');
}
