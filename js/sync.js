/**
 * Moteur de synchronisation Offline-First PWA pour EduManager
 * Utilise Dexie.js (IndexedDB)
 */

const db = new Dexie("EduManagerDB");

// Définition du schéma
db.version(1).stores({
    eleves: "id, matricule, nom, prenom, classe_id, etablissement_id, date_naissance, genre",
    enseignants: "id, matricule, nom, prenom, user_id, etablissement_id",
    classes: "id, nom, niveau, etablissement_id",
    matieres: "id, nom, enseignant_id, coefficient_defaut",
    notes: "id, eleve_id, matiere_id, periode_id, type_evaluation, valeur, statut",
    paiements: "id, eleve_id, montant, motif, date_paiement, statut, caissier_id",
    emplois_temps: "id, classe_id, matiere_id, enseignant_id, jour, heure_debut, heure_fin",
    periodes_evaluation: "id, nom, type, ordre, actif",
    offline_queue: "++id, action, table, data, timestamp" // action: 'insert', 'update', 'delete'
});

window.edumanagerDB = db;

// Utilities pour l'état réseau
let isOnline = navigator.onLine;

function updateNetworkStatus() {
    isOnline = navigator.onLine;
    const syncStatusEl = document.getElementById('syncStatusIndicator');
    if (syncStatusEl) {
        if (isOnline) {
            syncStatusEl.innerHTML = '<span class="badge bg-success rounded-pill"><i class="fas fa-wifi me-1"></i>En ligne</span>';
            // Dès qu'on revient en ligne, on lance la synchro
            pushOfflineQueue();
        } else {
            syncStatusEl.innerHTML = '<span class="badge bg-secondary rounded-pill"><i class="fas fa-plane me-1"></i>Hors ligne</span>';
        }
    }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

/**
 * PULL : Télécharger les données depuis Supabase vers Dexie
 * Stratégie : Stale-While-Revalidate ou au lancement
 */
async function pullDataFromSupabase() {
    if (!isOnline || !window.supabase) return;
    
    try {
        // Optionnel : Afficher un indicateur de synchro
        const syncStatusEl = document.getElementById('syncStatusIndicator');
        if (syncStatusEl && isOnline) syncStatusEl.innerHTML = '<span class="badge bg-warning text-dark rounded-pill"><i class="fas fa-sync fa-spin me-1"></i>Synchro...</span>';

        // 1. Classes
        const { data: classes } = await window.supabase.from('classes').select('*');
        if (classes && classes.length > 0) await db.classes.bulkPut(classes);

        // 2. Eleves
        const { data: eleves } = await window.supabase.from('eleves').select('*');
        if (eleves && eleves.length > 0) await db.eleves.bulkPut(eleves);

        // 3. Enseignants
        const { data: enseignants } = await window.supabase.from('enseignants').select('*');
        if (enseignants && enseignants.length > 0) await db.enseignants.bulkPut(enseignants);
        
        // 4. Périodes
        const { data: periodes } = await window.supabase.from('periodes_evaluation').select('*');
        if (periodes && periodes.length > 0) await db.periodes_evaluation.bulkPut(periodes);
        
        // 5. Notes
        const { data: notes } = await window.supabase.from('notes').select('*');
        if (notes && notes.length > 0) await db.notes.bulkPut(notes);

        // 6. Paiements
        const { data: paiements } = await window.supabase.from('paiements').select('*');
        if (paiements && paiements.length > 0) await db.paiements.bulkPut(paiements);

        if (syncStatusEl && isOnline) syncStatusEl.innerHTML = '<span class="badge bg-success rounded-pill"><i class="fas fa-wifi me-1"></i>En ligne</span>';
        
        // Dispatch un event pour que l'UI se mette à jour
        window.dispatchEvent(new CustomEvent('edumanager:sync-complete'));
        
    } catch (error) {
        console.error("Erreur lors du pull Supabase:", error);
    }
}

/**
 * PUSH : Envoyer les opérations de la file d'attente vers Supabase
 */
async function pushOfflineQueue() {
    if (!isOnline || !window.supabase) return;
    if (window.isSyncing) return; // Éviter la double synchro
    
    window.isSyncing = true;
    
    try {
        const queue = await db.offline_queue.orderBy('timestamp').toArray();
        if (queue.length === 0) {
            window.isSyncing = false;
            return;
        }
        
        const syncStatusEl = document.getElementById('syncStatusIndicator');
        if (syncStatusEl) syncStatusEl.innerHTML = '<span class="badge bg-warning text-dark rounded-pill"><i class="fas fa-sync fa-spin me-1"></i>Envoi des données...</span>';
        
        for (const item of queue) {
            let error = null;
            try {
                if (item.action === 'insert') {
                    // Supprimer l'ID temp s'il est généré (sauf s'il s'agit d'un UUID que nous avons nous même forgé proprement)
                    // Si on génère un UUID v4 côté client, on le garde.
                    const res = await window.supabase.from(item.table).insert(item.data);
                    error = res.error;
                } else if (item.action === 'update') {
                    const res = await window.supabase.from(item.table).update(item.data).eq('id', item.data.id);
                    error = res.error;
                } else if (item.action === 'delete') {
                    const res = await window.supabase.from(item.table).delete().eq('id', item.data.id);
                    error = res.error;
                }
                
                if (!error) {
                    // Succès, on supprime de la queue
                    await db.offline_queue.delete(item.id);
                } else {
                    console.error(`Erreur sync item ${item.id}:`, error);
                    // On pourrait implémenter une logique de Retry ou de Conflit ici
                }
            } catch (err) {
                console.error(`Exception sync item ${item.id}:`, err);
            }
        }
        
        if (syncStatusEl) syncStatusEl.innerHTML = '<span class="badge bg-success rounded-pill"><i class="fas fa-wifi me-1"></i>En ligne</span>';
    } finally {
        window.isSyncing = false;
        // On relance un petit pull après un push réussi pour être parfaitement raccord
        pullDataFromSupabase();
    }
}

/**
 * Fonction unifiée pour sauvegarder une donnée (Offline-First)
 */
async function saveRecord(table, data, action = 'insert') {
    try {
        // 1. Sauvegarde dans IndexedDB (UI instantanée)
        if (action === 'insert' || action === 'update') {
            // Si pas d'ID (et que c'est insert), on génère un UUID V4 local
            if (!data.id && action === 'insert') {
                data.id = crypto.randomUUID();
            }
            await db[table].put(data);
        } else if (action === 'delete') {
            await db[table].delete(data.id);
        }
        
        // 2. Ajout à la file d'attente
        await db.offline_queue.add({
            action: action,
            table: table,
            data: data,
            timestamp: Date.now()
        });
        
        // 3. Tenter la synchronisation immédiate si en ligne
        if (isOnline) {
            pushOfflineQueue();
        }
        
        return { success: true, data: data };
    } catch (e) {
        console.error("Erreur saveRecord:", e);
        return { success: false, error: e };
    }
}

/**
 * Auto-Save utility pour les formulaires
 * Ex: oninput="autoSaveForm('notes_form')"
 */
function autoSaveForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    localStorage.setItem(`autosave_${formId}`, JSON.stringify(data));
    
    const indicator = document.getElementById(`autosave_indicator_${formId}`);
    if (indicator) {
        indicator.innerHTML = '<i class="fas fa-check text-success"></i> Brouillon auto-sauvegardé';
        setTimeout(() => indicator.innerHTML = '', 3000);
    }
}

function restoreAutoSave(formId) {
    const saved = localStorage.getItem(`autosave_${formId}`);
    if (saved) {
        const data = JSON.parse(saved);
        const form = document.getElementById(formId);
        if (!form) return;
        
        for (const key in data) {
            const input = form.elements[key];
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.value === data[key]) input.checked = true;
                } else {
                    input.value = data[key];
                }
            }
        }
    }
}

function clearAutoSave(formId) {
    localStorage.removeItem(`autosave_${formId}`);
}

// Fonction utilitaire (qui existe déjà dans security.js mais on s'assure qu'elle est dispo)
async function getCurrentEtablissementId() {
    const session = await window.supabase.auth.getSession();
    if (!session.data.session) return null;
    const user = session.data.session.user;
    
    const { data: admin } = await window.supabase.from('etablissements').select('id').eq('admin_id', user.id).maybeSingle();
    if (admin) return admin.id;
    
    const { data: ens } = await window.supabase.from('enseignants').select('etablissement_id').eq('user_id', user.id).maybeSingle();
    if (ens) return ens.etablissement_id;
    
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    updateNetworkStatus();
    // Au démarrage, si on est en ligne, on tente de vider la file d'attente puis de pull
    setTimeout(() => {
        if (isOnline) {
            pushOfflineQueue();
        }
    }, 2000);
});
