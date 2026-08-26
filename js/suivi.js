// ==============================================
// Logique du Portail Parent - Suivi Scolaire
// ==============================================

// Empêcher l'échappement HTML pour l'affichage (sécurité basique)
function _e(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si déjà connecté (session active temporaire)
    const activeSession = sessionStorage.getItem('parent_session');
    if (activeSession) {
        try {
            const data = JSON.parse(activeSession);
            showDashboard(data);
        } catch(e) {}
    }

    const form = document.getElementById('suiviForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const matricule = document.getElementById('matricule').value.trim().toUpperCase();
            const codeAcces = document.getElementById('code_acces').value.trim().toUpperCase();

            const btn = document.querySelector('#suiviForm button[type="submit"]');
            const oldHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Recherche...';
            btn.disabled = true;

            try {
                // Appel RPC (Fonction Sécurisée contournant le RLS pour consultation publique)
                const { data, error } = await window.supabase.rpc('get_eleve_bulletins_secure', {
                    p_matricule: matricule,
                    p_code_acces: codeAcces
                });

                if (error) throw error;

                if (!data) {
                    throw new Error("Matricule ou Code d'accès invalide.");
                }

                // Sauvegarder la session temporairement et afficher
                sessionStorage.setItem('parent_session', JSON.stringify(data));
                showDashboard(data);

            } catch(err) {
                console.error(err);
                btn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>' + (err.message || 'Erreur inattendue');
                btn.classList.replace('btn-primary', 'btn-danger');
                setTimeout(() => {
                    btn.innerHTML = oldHtml;
                    btn.classList.replace('btn-danger', 'btn-primary');
                    btn.disabled = false;
                }, 3000);
            }
        });
    }
});

function showDashboard(data) {
    // Masquer le form, afficher le dashboard
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';

    const eleve = data.eleve;
    const etab = data.etablissement;
    const bulletins = data.bulletins || [];

    // Header Etablissement
    if (etab.logo_url) document.getElementById('dashLogo').src = etab.logo_url;
    document.getElementById('dashEtabNom').textContent = etab.nom;
    let contactInfo = [];
    if (etab.telephone) contactInfo.push(`<i class="fas fa-phone me-1"></i>${etab.telephone}`);
    if (etab.email) contactInfo.push(`<i class="fas fa-envelope me-1"></i>${etab.email}`);
    document.getElementById('dashEtabContact').innerHTML = contactInfo.join(' <span class="mx-2">|</span> ');

    // Info Eleve
    document.getElementById('dashEleveNom').textContent = `${_e(eleve.prenom)} ${_e(eleve.nom)}`;
    document.getElementById('dashEleveClasse').textContent = eleve.classe || 'Non assigné';
    document.getElementById('dashEleveMatricule').textContent = eleve.matricule;
    document.getElementById('dashBulletinsCount').textContent = bulletins.length;

    // Rendu Bulletins
    const container = document.getElementById('bulletinsContainer');
    container.innerHTML = '';

    if (bulletins.length === 0) {
        container.innerHTML = `
            <div class="text-center p-5 text-muted bg-white rounded-3 border">
                <i class="fas fa-folder-open fs-1 mb-3 opacity-25"></i>
                <h5>Aucun bulletin publié</h5>
                <p class="mb-0 small">Les résultats ne sont pas encore disponibles pour consultation.</p>
            </div>
        `;
        return;
    }

    bulletins.forEach(b => {
        // Obtenir la classe css pour la mention
        let mentionClass = 'bg-secondary text-white';
        if (b.mention) {
            const m = b.mention.toLowerCase();
            if (m.includes('très bien') || m.includes('excellent')) mentionClass = 'mention-tb';
            else if (m.includes('bien')) mentionClass = 'mention-b';
            else if (m.includes('assez bien')) mentionClass = 'mention-ab';
            else if (m.includes('passable')) mentionClass = 'mention-p';
            else if (m.includes('médiocre') || m.includes('insuffisant') || m.includes('faible')) mentionClass = 'mention-m';
        }

        const card = document.createElement('div');
        card.className = 'bulletin-card';
        
        let headerHtml = `
            <div class="d-flex align-items-start justify-content-between cursor-pointer" onclick="toggleBulletinDetails('${b.id}')">
                <div>
                    <h5 class="fw-bold mb-1 text-primary"><i class="fas fa-file-invoice me-2"></i>Bulletin - ${_e(b.periode)}</h5>
                    <div class="text-muted small">Publié le ${new Date(b.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold fs-4">${parseFloat(b.moyenne_generale || 0).toFixed(2)}<span style="font-size:1rem;color:#94a3b8">/20</span></div>
                    <div class="mention-badge ${mentionClass} d-inline-block mt-1">${_e(b.mention || 'Non définie')}</div>
                </div>
            </div>
            
            <div class="d-flex gap-3 mt-3">
                <span class="badge bg-light text-dark border">Rang: <strong class="text-primary">${b.rang ? b.rang + (b.rang === 1 ? 'er' : 'ème') : '-'}</strong></span>
                <button class="btn btn-sm btn-link text-decoration-none p-0 ms-auto" onclick="toggleBulletinDetails('${b.id}')">
                    Voir les détails <i class="fas fa-chevron-down ms-1" id="icon-${b.id}"></i>
                </button>
            </div>
        `;

        // Render details from JSON
        let detailsHtml = `<div class="bulletin-details" id="details-${b.id}" style="display:none; margin-top: 15px;">`;
        
        if (b.donnees_json && Object.keys(b.donnees_json).length > 0 && !b.donnees_json.lignes) {
            let isIntegral = !!b.donnees_json.html_rows;
            let rowsHtml = '';
            let headerSeqHtml = '';
            
            if (isIntegral) {
                rowsHtml = b.donnees_json.html_rows;
                headerSeqHtml = b.donnees_json.html_header || '';
            } else {
                let matStats = b.donnees_json.matieres || b.donnees_json;
                let categories = {};
                for (let mId in matStats) {
                    if (mId === 'html_header' || mId === 'html_rows') continue;
                    let m = matStats[mId];
                    let cat = m.categorie || 'Enseignement Général';
                    if (!categories[cat]) categories[cat] = [];
                    categories[cat].push(m);
                }

                for (let cat in categories) {
                    rowsHtml += `<tr><td colspan="5" class="bg-light fw-bold text-start text-primary" style="text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px;">${_e(cat)}</td></tr>`;
                    categories[cat].forEach(m => {
                        let sum = 0; let count = 0;
                        for (let p in m.notesPeriodes) {
                            sum += m.notesPeriodes[p];
                            count++;
                        }
                        let moy = count > 0 ? (sum / count) : 0;
                        let moyFormatted = moy.toFixed(2);
                        let noteColor = moy >= 10 ? 'text-success' : 'text-danger';
                        let totalPoints = (moy * m.coef).toFixed(2);
                        
                        rowsHtml += `
                            <tr>
                                <td class="text-start">
                                    <div class="fw-bold text-dark" style="font-size: 0.95rem">${_e(m.nom)}</div>
                                    <div class="text-muted" style="font-size: 0.75rem; font-style: italic;">Prof: ${_e(m.prof)}</div>
                                </td>
                                <td class="align-middle">${m.coef}</td>
                                <td class="align-middle fw-bold ${noteColor}" style="background-color:rgba(0,0,0,.03);">${moyFormatted}</td>
                                <td class="align-middle fw-bold">${totalPoints}</td>
                                <td class="text-muted small text-start align-middle">${_e(m.appreciation)}</td>
                            </tr>
                        `;
                    });
                }
            }

            let cInfo = {
                nameFR: "République du Cameroun", mottoFR: "Paix - Travail - Patrie",
                nameEN: "Republic of Cameroon", mottoEN: "Peace - Work - Fatherland",
                flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Flag_of_Cameroon.svg/256px-Flag_of_Cameroon.svg.png"
            };

            detailsHtml += `
            <div class="bulletin-page" style="padding: 20px; background: white; margin-top: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e3e6f0;">
                <div class="bulletin-header d-flex justify-content-between align-items-center mb-4 pb-3" style="border-bottom: 3px solid var(--primary);">
                    <div class="text-center" style="flex:1">
                        <div class="fw-bold text-uppercase">${cInfo.nameFR}</div>
                        <div class="small text-muted">${cInfo.mottoFR}</div>
                    </div>
                    <div style="width: 100px; text-align:center">
                        ${etab.logo_url ? `<img src="${etab.logo_url}" alt="Logo" style="max-height:80px; max-width:100px;">` : `<img src="${cInfo.flagUrl}" alt="Flag" style="height:50px; opacity:0.8">`}
                    </div>
                    <div class="text-center" style="flex:1">
                        <div class="fw-bold text-uppercase">${cInfo.nameEN}</div>
                        <div class="small text-muted">${cInfo.mottoEN}</div>
                    </div>
                </div>
                
                <div class="text-center mb-4">
                    <h2 class="fw-bold text-uppercase m-0" style="color: var(--primary); letter-spacing: 1px;">${etab.nom}</h2>
                    <div class="text-muted small">${etab.adresse || ''} | Tél: ${etab.telephone || ''} | Email: ${etab.email || ''}</div>
                    <div class="badge bg-primary mt-2 px-3 py-2 fs-6">BULLETIN - ${_e(b.periode).toUpperCase()}</div>
                </div>
                
                <div class="row mb-4 p-3 rounded g-3" style="background-color: #f8f9fc; border: 1px solid #e3e6f0;">
                    <div class="col-12 col-md-4">
                        <div class="text-muted small fw-bold text-uppercase">Nom de l'élève</div>
                        <div class="fs-5 fw-bold text-dark">${eleve.nom} ${eleve.prenom}</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="text-muted small fw-bold text-uppercase">Matricule</div>
                        <div class="fs-6 fw-semibold text-dark mt-1">${eleve.matricule || '-'}</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="text-muted small fw-bold text-uppercase">Classe</div>
                        <div class="fs-6 fw-semibold text-dark mt-1">${eleve.classe || '-'}</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="text-muted small fw-bold text-uppercase">Année Scolaire</div>
                        <div class="fs-6 fw-semibold text-primary mt-1">${b.donnees_json?.annee_scolaire || 'Année en cours'}</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="text-muted small fw-bold text-uppercase">Assiduité (Année)</div>
                        <div class="fs-6 fw-semibold text-info mt-1">${b.donnees_json?.assiduite_str || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="table-responsive mt-3 mb-4">
                    <table class="table table-bordered text-center align-middle bulletin-table mb-0" style="font-size: 0.9rem">
                        <thead class="text-white" style="background-color: #0d6efd !important;">
                            <tr>
                                <th class="text-start" style="width: 25%">Matière</th>
                                <th>Coef</th>
                                ${headerSeqHtml}
                                <th>Moyenne (/20)</th>
                                ${isIntegral ? '<th>Rang</th>' : ''}
                                <th>Total Points</th>
                                <th class="text-start" style="width: 20%">Appréciation / Observation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                
                <div class="summary-box p-3 rounded mb-4" style="background: rgba(13,110,253,0.05); border: 1px solid rgba(13,110,253,0.2);">
                    <div class="row text-center align-items-center">
                        <div class="col border-end">
                            <div class="text-muted small fw-bold text-uppercase">Total Points</div>
                            <div class="fs-4 fw-bold">${parseFloat(b.total_points || 0).toFixed(2)}</div>
                        </div>
                        <div class="col border-end">
                            <div class="text-muted small fw-bold text-uppercase">Total Coefs</div>
                            <div class="fs-4 fw-bold">${parseFloat(b.total_coefs || 0).toFixed(2)}</div>
                        </div>
                        <div class="col border-end" style="background: white; border-radius: 8px; margin: 0 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 10px 0;">
                            <div class="text-muted small fw-bold text-uppercase">Moyenne de l'élève</div>
                            <div class="fs-2 fw-bold ${parseFloat(b.moyenne_generale) >= 10 ? 'text-success' : 'text-danger'}">${parseFloat(b.moyenne_generale || 0).toFixed(2)}</div>
                            <div class="small text-muted">/20</div>
                        </div>
                        <div class="col border-end">
                            <div class="text-muted small fw-bold text-uppercase">Mention</div>
                            <div class="fs-5 fw-bold">${_e(b.mention || 'N/A')}</div>
                        </div>
                        ${b.decision ? `
                        <div class="col border-end">
                            <div class="text-muted small fw-bold text-uppercase">Décision du conseil</div>
                            <div class="fs-5 fw-bold">${_e(b.decision)}</div>
                        </div>` : ''}
                        <div class="col border-end">
                            <div class="text-muted small fw-bold text-uppercase">Rang de l'élève</div>
                            <div class="fs-4 fw-bold text-primary">${b.rang ? b.rang + (b.rang === 1 ? 'er' : 'ème') : '-'} ${b.effectif_classe ? '/ ' + b.effectif_classe : ''}</div>
                        </div>
                        <div class="col">
                            <div class="text-muted small fw-bold text-uppercase">Moyenne Générale de la Classe</div>
                            <div class="fs-5 fw-bold">${b.moyenne_classe ? parseFloat(b.moyenne_classe).toFixed(2) : '-'} <small class="text-muted" style="font-size:0.9rem">/20</small></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (b.donnees_json && b.donnees_json.lignes) {
            // Ancien format (rétrocompatibilité)
            b.donnees_json.lignes.forEach(ligne => {
                let noteColor = parseFloat(ligne.moyenne) < 10 ? 'text-danger fw-bold' : 'text-dark fw-bold';
                detailsHtml += `
                    <div class="subject-row p-2 border-bottom">
                        <div class="flex-grow-1">
                            <div class="fw-semibold text-dark">${_e(ligne.matiere)} <span class="badge bg-light text-dark ms-1">Coef ${ligne.coef}</span></div>
                            <div class="small text-muted fst-italic mt-1">${_e(ligne.appreciation || '')}</div>
                        </div>
                        <div class="text-end" style="width:100px">
                            <div class="${noteColor}">${parseFloat(ligne.moyenne || 0).toFixed(2)}/20</div>
                        </div>
                    </div>
                `;
            });
        } else {
            detailsHtml += `<div class="text-center text-muted small p-2">Détails non disponibles</div>`;
        }
        detailsHtml += `</div>`;

        card.innerHTML = headerHtml + detailsHtml;
        container.appendChild(card);
    });
}

function toggleBulletinDetails(id) {
    const el = document.getElementById(`details-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (el.style.display === 'block') {
        el.style.display = 'none';
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
        el.style.display = 'block';
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

function logoutParent() {
    sessionStorage.removeItem('parent_session');
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('matricule').value = '';
    document.getElementById('code_acces').value = '';
}
