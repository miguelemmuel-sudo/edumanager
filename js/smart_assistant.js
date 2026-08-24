/* ==============================================
   EduManager - Smart Assistant
   Analyse l'état réel de l'établissement et propose 
   des recommandations dynamiques.
============================================== */

const SmartAssistant = {
    containerId: 'smartAssistantContainer',
    
    // Les différentes étapes de l'onboarding de base
    steps: [
        {
            id: 'enseignants',
            title: 'Ajouter un enseignant',
            check: async () => await SmartAssistant.hasData('enseignants'),
            action: { label: '➕ Nouvel enseignant', url: 'enseignants.html', isModal: true, target: '#enseignantModal' },
            message: 'Votre établissement est créé ! Commencez par enregistrer votre équipe pédagogique.'
        },
        {
            id: 'classes',
            title: 'Créer les classes',
            check: async () => await SmartAssistant.hasData('classes'),
            action: { label: '➕ Créer une classe', url: 'classes.html' },
            message: 'Les enseignants sont prêts. Définissez maintenant les classes (ex: 6ème A, CM1).'
        },
        {
            id: 'matieres',
            title: 'Configurer les matières',
            check: async () => await SmartAssistant.hasData('matieres'),
            action: { label: '➕ Ajouter une matière', url: 'classes.html' },
            message: 'Associez des matières et des coefficients à vos classes pour préparer les bulletins.'
        },
        {
            id: 'eleves',
            title: 'Inscrire les élèves',
            check: async () => await SmartAssistant.hasData('eleves'),
            action: { label: '➕ Nouvel élève', url: 'eleves.html' },
            message: 'La structure pédagogique est en place. Vous pouvez commencer les inscriptions !'
        }
    ],

    init: async function() {
        const sessionStr = localStorage.getItem('edu_session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        if (!session.etab_id) return;
        
        // Uniquement pour la direction / admin
        if (!session.role || !['Superadmin', 'Administrateur', 'Direction'].includes(session.role)) return;

        this.etab_id = session.etab_id;
        
        await this.analyzeState();
    },

    hasData: async function(table) {
        try {
            const { count, error } = await window.supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('etablissement_id', this.etab_id);
            return count > 0;
        } catch (e) {
            console.error('SmartAssistant Error:', e);
            return false;
        }
    },

    analyzeState: async function() {
        let completedSteps = 0;
        let nextAction = null;

        for (const step of this.steps) {
            const isCompleted = await step.check();
            if (isCompleted) {
                completedSteps++;
            } else if (!nextAction) {
                nextAction = step;
            }
        }

        const progressPercent = Math.round((completedSteps / this.steps.length) * 100);
        this.render(progressPercent, nextAction);
    },

    render: function(progressPercent, nextAction) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Si tout est complet à 100%, on masque l'assistant de base (mode discret)
        if (!nextAction) {
            container.classList.add('d-none');
            return;
        }

        container.classList.remove('d-none');
        
        // Bouton d'action (lien ou modale)
        let btnHtml = '';
        if (nextAction.action.isModal) {
            btnHtml = `<button onclick="window.location.href='${nextAction.action.url}'" class="btn btn-primary rounded-pill px-4 py-2 smart-pulse shadow-sm fw-bold">
                        ${nextAction.action.label}
                       </button>`;
        } else {
            btnHtml = `<a href="${nextAction.action.url}" class="btn btn-primary rounded-pill px-4 py-2 smart-pulse shadow-sm fw-bold">
                        ${nextAction.action.label}
                       </a>`;
        }

        container.innerHTML = `
            <div class="smart-card">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="smart-card-title">
                            <i class="fas fa-magic text-primary"></i> 
                            Assistant de configuration
                        </div>
                        <p class="text-muted mb-2" style="font-size: 0.9rem;">
                            ${nextAction.message}
                        </p>
                        <div class="d-flex align-items-center gap-2 mb-1" style="font-size: 0.8rem; font-weight: 600;">
                            <span>Configuration de l'établissement</span>
                            <span class="ms-auto text-primary">${progressPercent}%</span>
                        </div>
                        <div class="progress-bar-custom">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end mt-3 mt-md-0">
                        ${btnHtml}
                    </div>
                </div>
                <button onclick="document.getElementById('smartAssistantContainer').style.display='none'" 
                        class="btn btn-link text-muted p-0 position-absolute" 
                        style="top: 10px; right: 15px; font-size: 1.2rem; text-decoration: none;">&times;</button>
            </div>
        `;
    }
};

// Initialisation au chargement de la page si Supabase est dispo
document.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour s'assurer que supabase.js est bien chargé
    setTimeout(() => {
        if (window.supabase) {
            SmartAssistant.init();
        }
    }, 1000);
});
