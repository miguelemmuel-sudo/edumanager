const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const paiementsCRUD = `
// --- PAIEMENTS ---
async function fetchAndRenderPaiements() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('paiementsBody');
    if (!tbody) return;

    // Load eleves for the select
    const pEleveSelect = document.getElementById('paiementEleveSelect');
    if (pEleveSelect && pEleveSelect.children.length <= 1) {
        const { data: eleves } = await window.supabase.from('eleves').select('id, nom, prenom, matricule');
        if (eleves) {
            pEleveSelect.innerHTML = '<option value="">Sélectionner un élève...</option>' + eleves.map(e => \`<option value="\${e.id}">\${_e(e.matricule || '-')} - \${_e(e.prenom)} \${_e(e.nom)}</option>\`).join('');
        }
    }

    const { data: paiements, error } = await window.supabase.from('paiements').select('*, eleves(nom, prenom, matricule)');
    if (error) return console.error(error);

    let totalCollecte = 0;
    let nbSoldes = 0;
    let nbPartiels = 0;
    let nbImpayes = 0;
    
    paiements.forEach(p => {
        const mt = parseFloat(p.montant) || 0;
        totalCollecte += mt;
        const st = (p.statut || '').toLowerCase();
        if (st.includes('payé') && !st.includes('impayé') && !st.includes('soldé')) nbSoldes++;
        else if (st.includes('soldé')) nbSoldes++;
        else if (st.includes('partiel')) nbPartiels++;
        else if (st.includes('impayé')) nbImpayes++;
    });

    const totalEleves = nbSoldes + nbPartiels + nbImpayes;
    const pSoldes = totalEleves ? Math.round((nbSoldes/totalEleves)*100) : 0;
    const pPartiels = totalEleves ? Math.round((nbPartiels/totalEleves)*100) : 0;
    const pImpayes = totalEleves ? 100 - pSoldes - pPartiels : 0;

    // Update Top KPIs
    const scValues = document.querySelectorAll('.sc-value');
    if(scValues.length >= 4) {
        scValues[0].textContent = totalCollecte.toLocaleString() + ' FCFA';
        scValues[1].textContent = nbSoldes;
        scValues[2].textContent = nbPartiels;
        scValues[3].textContent = nbImpayes;
    }

    // Update Detailed Stats if they exist
    const elSCnt = document.getElementById('payStatsSoldesCount');
    if(elSCnt) {
        elSCnt.textContent = nbSoldes + ' élèves';
        document.getElementById('payStatsSoldesVal').textContent = pSoldes + '% · ' + (totalCollecte).toLocaleString() + ' FCFA';
        document.getElementById('payStatsPartielsCount').textContent = nbPartiels + ' élèves';
        document.getElementById('payStatsPartielsVal').textContent = pPartiels + '%';
        document.getElementById('payStatsImpayesCount').textContent = nbImpayes + ' élèves';
        document.getElementById('payStatsImpayesVal').textContent = pImpayes + '%';
    }

    if (paiements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    paiements.forEach(p => {
        const el = p.eleves || {};
        const stColor = (p.statut || '').toLowerCase().includes('soldé') || (p.statut || '').toLowerCase().includes('payé') ? 'success' : 
                        (p.statut || '').toLowerCase().includes('partiel') ? 'warning' : 'danger';
        
        tbody.innerHTML += \`
            <tr>
                <td><strong>\${_e(el.matricule || '-')}</strong></td>
                <td><div class="fw-semibold">\${_e(el.prenom)} \${_e(el.nom)}</div></td>
                <td>\${_e(p.motif || 'Scolarité')}</td>
                <td><span class="text-success fw-bold">\${p.montant} FCFA</span></td>
                <td>\${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td><span class="status-badge \${stColor}">\${_e(p.statut || 'Enregistré')}</span></td>
                <td>
                    <button class="btn btn-sm btn-icon text-primary" title="Reçu"><i class="fas fa-file-invoice"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deletePaiement('\${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        \`;
    });
}

function setupPaiementsModal() {
    const btnSavePaiement = document.getElementById('btnSavePaiement');
    if (!btnSavePaiement) return;
    
    btnSavePaiement.addEventListener('click', async () => {
        const data = getFormData('addPaiementModal');
        if (!data.eleve_id || !data.montant) {
            if(window.showToast) window.showToast('Veuillez renseigner l\\'élève et le montant.', 'warning');
            return;
        }
        
        // Ensure statut is set automatically or retrieved
        data.statut = 'Soldé'; 
        
        btnSavePaiement.disabled = true; btnSavePaiement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('paiements').insert([data]);
        btnSavePaiement.disabled = false; btnSavePaiement.innerHTML = 'Enregistrer & Générer reçu';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Paiement enregistré avec succès', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPaiementModal'));
            if(modal) modal.hide();
            clearFormData('addPaiementModal');
            fetchAndRenderPaiements();
        }
    });
}

window.deletePaiement = async function(id) {
    if(!confirm('Supprimer ce paiement ?')) return;
    await window.supabase.from('paiements').delete().eq('id', id);
    if(window.showToast) window.showToast('Paiement supprimé', 'success');
    fetchAndRenderPaiements();
}
`;

const startIdx = appJs.indexOf('// --- PAIEMENTS ---');
const endIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1 && endIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + paiementsCRUD + '\n\n' + appJs.substring(endIdx);
    
    // Uncomment setupPaiementsModal inside DOMContentLoaded if it exists, otherwise add it.
    if (appJs.includes('// setupPaiementsModal();')) {
        appJs = appJs.replace('// setupPaiementsModal();', 'setupPaiementsModal();');
    } else if (appJs.includes('fetchAndRenderPaiements();') && !appJs.includes('setupPaiementsModal();')) {
        appJs = appJs.replace('fetchAndRenderPaiements();', 'fetchAndRenderPaiements();\n        setupPaiementsModal();');
    }

    fs.writeFileSync('js/app.js', appJs);
    console.log('Paiements CRUD logic injected');
} else {
    console.log('Markers not found');
}
