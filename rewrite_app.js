const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const helpers = `
// --- GENERIC HELPERS ---
function getFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return {};
    const inputs = modal.querySelectorAll('input[name], select[name], textarea[name]');
    const data = {};
    inputs.forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') {
            if (i.checked) data[i.name] = i.value;
        } else {
            let val = i.value.trim();
            if (val !== '') data[i.name] = val;
        }
    });
    return data;
}
function clearFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input[name], select[name], textarea[name]').forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
        else if (i.tagName === 'SELECT') i.selectedIndex = 0;
        else i.value = '';
    });
}
`;

const elevesCRUD = `
// --- ÉLÈVES ---
async function fetchAndRenderEleves() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('elevesBody');
    if (!tbody) return;

    // Load classes for the dropdown
    const classeSelect = document.getElementById('classeSelect');
    if (classeSelect && classeSelect.children.length <= 1) {
        const { data: classes } = await window.supabase.from('classes').select('id, nom');
        if (classes) {
            classeSelect.innerHTML = '<option value="">Sélectionner une classe</option>' + classes.map(c => \`<option value="\${c.id}">\${_e(c.nom)}</option>\`).join('');
        }
    }

    const { data: eleves, error } = await window.supabase.from('eleves').select('*, classes(nom)');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = eleves.length; });
    const info = document.getElementById('elevesPaginationInfo');
    if (info) info.textContent = \`Affichage de 1 à \${eleves.length} sur \${eleves.length} élèves\`;

    if (eleves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Aucun élève trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    eleves.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
            <td><input class="form-check-input row-check" type="checkbox"></td>
            <td><div class="d-flex align-items-center"><div class="table-av me-2" style="background:#2563EB">\${e.prenom.charAt(0)}</div><span class="fw-semibold">\${_e(e.prenom)} \${_e(e.nom)}</span></div></td>
            <td>\${_e(e.matricule || '-')}</td>
            <td><span class="status-badge primary">\${_e(e.classes ? e.classes.nom : 'Non assigné')}</span></td>
            <td>\${e.date_naissance ? new Date(e.date_naissance).toLocaleDateString('fr-FR') : '-'}</td>
            <td>\${_e(e.parent_nom || '-')} <br><small class="text-muted">\${_e(e.parent_tel || '-')}</small></td>
            <td><span class="status-badge \${e.statut_paiement === 'À jour' ? 'success' : 'warning'}">\${_e(e.statut_paiement || 'Inconnu')}</span></td>
            <td>
                <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-icon text-danger" onclick="deleteEleve('\${e.id}')"><i class="fas fa-trash"></i></button>
            </td>
        \`;
        tbody.appendChild(tr);
    });
}
function setupElevesModal() {
    const btn = document.querySelector('#addEleveModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addEleveModal');
        if (!data.prenom || !data.nom || !data.classe_id) {
            if(window.showToast) window.showToast('Prénom, nom et classe requis', 'warning');
            return;
        }
        
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('eleves').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Élève ajouté', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEleveModal'));
            if(modal) modal.hide();
            clearFormData('addEleveModal');
            fetchAndRenderEleves();
        }
    });
}
window.deleteEleve = async function(id) {
    if(!confirm('Supprimer cet élève ?')) return;
    await window.supabase.from('eleves').delete().eq('id', id);
    if(window.showToast) window.showToast('Élève supprimé', 'success');
    fetchAndRenderEleves();
}
`;

const enseignantsCRUD = `
// --- ENSEIGNANTS ---
async function fetchAndRenderEnseignants() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('enseignantsBody');
    const gridBody = document.getElementById('ensGrid');
    if (!tbody && !gridBody) return;

    const { data: enseignants, error } = await window.supabase.from('enseignants').select('*');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = enseignants.length; });

    if (enseignants.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Aucun enseignant</td></tr>';
        if (gridBody) gridBody.innerHTML = '<div class="col-12 text-center py-4 text-muted">Aucun enseignant</div>';
        return;
    }

    if (tbody) tbody.innerHTML = '';
    if (gridBody) gridBody.innerHTML = '';
    
    enseignants.forEach(e => {
        const initiale = e.prenom ? e.prenom.charAt(0).toUpperCase() : 'E';
        const nomComplet = \`\${_e(e.prenom)} \${_e(e.nom)}\`;
        
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td><div class="d-flex align-items-center"><div class="table-av me-2" style="background:#10B981">\${initiale}</div><span class="fw-semibold">\${nomComplet}</span></div></td>
                <td>\${_e(e.matiere || '-')}</td>
                <td><span class="status-badge primary">0</span></td>
                <td>\${_e(e.tel || '-')}</td>
                <td>\${_e(e.email || '-')}</td>
                <td><span class="status-badge success">\${_e(e.statut || 'Actif')}</span></td>
                <td>
                    <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deleteEnseignant('\${e.id}')"><i class="fas fa-trash"></i></button>
                </td>
            \`;
            tbody.appendChild(tr);
        }
        
        if (gridBody) {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 ens-card';
            card.innerHTML = \`
            <div class="dash-card p-4 h-100">
              <div class="d-flex align-items-start justify-content-between mb-3">
                <div class="d-flex align-items-center gap-3">
                  <div class="table-av" style="width:48px;height:48px;font-size:1.2rem;background:#2563EB">\${initiale}</div>
                  <div>
                    <div class="fw-bold" style="font-size:.95rem">\${nomComplet}</div>
                    <div class="text-muted" style="font-size:.8rem">\${_e(e.matiere || '-')}</div>
                  </div>
                </div>
                <span class="status-badge success">\${_e(e.statut || 'Actif')}</span>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <div style="font-size:.72rem;color:var(--muted)">Email</div>
                  <div style="font-size:.78rem">\${_e(e.email || '-')}</div>
                </div>
                <div class="col-6">
                  <div style="font-size:.72rem;color:var(--muted)">Tél.</div>
                  <div style="font-size:.78rem">\${_e(e.tel || '-')}</div>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(245,158,11,.1);color:var(--warning);font-size:.8rem"><i class="fas fa-edit me-1"></i>Modifier</button>
                <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(239,68,68,.1);color:var(--danger);font-size:.8rem" onclick="deleteEnseignant('\${e.id}')"><i class="fas fa-trash me-1"></i>Supprimer</button>
              </div>
            </div>
            \`;
            gridBody.appendChild(card);
        }
    });
}
function setupEnseignantsModal() {
    const btn = document.querySelector('#addEnsModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addEnsModal');
        if (!data.prenom || !data.nom || !data.email) {
            if(window.showToast) window.showToast('Prénom, nom et email requis', 'warning');
            return;
        }
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('enseignants').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Enseignant ajouté', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEnsModal'));
            if(modal) modal.hide();
            clearFormData('addEnsModal');
            fetchAndRenderEnseignants();
        }
    });
}
window.deleteEnseignant = async function(id) {
    if(!confirm('Supprimer cet enseignant ?')) return;
    await window.supabase.from('enseignants').delete().eq('id', id);
    if(window.showToast) window.showToast('Enseignant supprimé', 'success');
    fetchAndRenderEnseignants();
}
`;

const classesCRUD = `
// --- CLASSES ---
async function fetchAndRenderClasses() {
    const container = document.getElementById('classesContainer');
    if (!container) return;

    // Load enseignants for dropdown
    const profSelect = document.getElementById('profSelect');
    if (profSelect && profSelect.children.length <= 1) {
        const { data: profs } = await window.supabase.from('enseignants').select('id, prenom, nom');
        if (profs) {
            profSelect.innerHTML = '<option value="">Sélectionner un prof</option>' + profs.map(p => \`<option value="\${p.id}">\${_e(p.prenom)} \${_e(p.nom)}</option>\`).join('');
        }
    }

    const { data: classes, error } = await window.supabase.from('classes').select('*, enseignants(nom, prenom), eleves(count)');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = classes.length; });

    if (classes.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">Aucune classe disponible</div>';
        return;
    }

    // Group by niveau
    const niveaux = {};
    classes.forEach(c => {
        const niv = c.niveau || 'Autre';
        if (!niveaux[niv]) niveaux[niv] = [];
        niveaux[niv].push(c);
    });

    const niveauColors = { 'Terminale':'#1E293B', '1ère':'#EF4444', '2nde':'#8B5CF6', '3ème':'#10B981', '4ème':'#F59E0B', '5ème':'#06B6D4', '6ème':'#2563EB', 'Autre': '#64748b' };

    container.innerHTML = '';
    for (const [niv, cls] of Object.entries(niveaux)) {
        const color = niveauColors[niv] || niveauColors['Autre'];
        container.innerHTML += \`
            <h6 class="fw-bold mb-3 text-muted text-uppercase" style="font-size:.75rem;letter-spacing:.5px;margin-top:2rem">\${_e(niv)}</h6>
            <div class="row g-3 mb-4">
                \${cls.map(c => {
                    const prof = c.enseignants ? \`\${c.enseignants.prenom} \${c.enseignants.nom}\` : 'Non assigné';
                    const nbEleves = c.eleves && c.eleves[0] ? c.eleves[0].count : 0;
                    return \`
                    <div class="col-md-6 col-lg-3">
                        <div class="dash-card p-4 h-100" style="border-top:3px solid \${color}">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <div class="fw-bold fs-6">\${_e(c.nom)}</div>
                                <span class="status-badge primary">\${nbEleves} élèves</span>
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Prof. principal</div><div style="font-size:.82rem;font-weight:600">\${_e(prof)}</div></div>
                                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Salle</div><div style="font-size:.82rem;font-weight:600">\${_e(c.salle || '-')}</div></div>
                            </div>
                            <div class="d-flex gap-2 mt-3">
                                <a href="eleves.html" class="btn btn-sm flex-1 rounded-pill" style="background:rgba(37,99,235,.1);color:var(--primary);font-size:.78rem"><i class="fas fa-users me-1"></i>Élèves</a>
                                <button class="btn btn-sm btn-icon text-danger" onclick="deleteClasse('\${c.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                    \`;
                }).join('')}
            </div>
        \`;
    }
}
function setupClassesModal() {
    const btn = document.querySelector('#addClasseModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addClasseModal');
        if (!data.nom || !data.niveau) {
            if(window.showToast) window.showToast('Nom et niveau requis', 'warning');
            return;
        }
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('classes').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Classe ajoutée', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addClasseModal'));
            if(modal) modal.hide();
            clearFormData('addClasseModal');
            fetchAndRenderClasses();
        }
    });
}
window.deleteClasse = async function(id) {
    if(!confirm('Supprimer cette classe ?')) return;
    await window.supabase.from('classes').delete().eq('id', id);
    if(window.showToast) window.showToast('Classe supprimée', 'success');
    fetchAndRenderClasses();
}
`;

// Replace lines 71 to 328
const startIdx = appJs.indexOf('// --- ÉLÈVES ---');
const endIdx = appJs.indexOf('// --- PAIEMENTS ---');

if (startIdx !== -1 && endIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + helpers + elevesCRUD + enseignantsCRUD + classesCRUD + appJs.substring(endIdx);
    
    // Uncomment setupClassesModal inside DOMContentLoaded
    appJs = appJs.replace('// setupClassesModal();', 'setupClassesModal();');

    fs.writeFileSync('js/app.js', appJs);
    console.log('app.js updated successfully');
} else {
    console.log('Markers not found');
}
