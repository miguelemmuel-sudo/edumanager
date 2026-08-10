
/* ==============================================
   EduManager – RBAC Security Middleware
============================================== */

const ROLE_PERMISSIONS = {
    'admin': ['*'],
    'comptable': ['/dashboard/paiements.html', '/dashboard/rapports.html', '/dashboard/index.html'],
    'enseignant': ['/dashboard/enseignant.html', '/dashboard/classes.html', '/dashboard/eleves.html', '/dashboard/notes.html', '/dashboard/emploi-du-temps.html', '/dashboard/messages.html'],
    'parent': ['/dashboard/parent.html', '/dashboard/notes.html', '/dashboard/paiements.html', '/dashboard/messages.html', '/dashboard/notifications.html', '/dashboard/emploi-du-temps.html'],
    'eleve': ['/dashboard/eleve.html', '/dashboard/notes.html', '/dashboard/emploi-du-temps.html', '/dashboard/messages.html', '/dashboard/notifications.html'],
    'secretaire': ['/dashboard/index.html', '/dashboard/eleves.html', '/dashboard/messages.html'],
    'surveillant': ['/dashboard/index.html', '/dashboard/eleves.html', '/dashboard/messages.html']
};

function checkAccess() {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) {
        window.location.href = '../signin.html';
        return;
    }
    
    try {
        const session = JSON.parse(sessionStr);
        let role = (session.role || 'admin').toLowerCase();
        
        // Normalize role names
        if (role.includes('directeur')) role = 'admin';
        if (role.includes('gestionnaire')) role = 'comptable';
        
        const path = window.location.pathname.toLowerCase();
        
        // Redirect index.html to specific dashboards if needed
        if (path.endsWith('/dashboard/') || path.endsWith('index.html')) {
            if (role === 'enseignant') {
                window.location.href = 'enseignant.html';
                return;
            } else if (role === 'parent') {
                window.location.href = 'parent.html';
                return;
            } else if (role === 'eleve') {
                window.location.href = 'eleve.html';
                return;
            }
        }

        const perms = ROLE_PERMISSIONS[role] || [];
        if (perms.includes('*')) return; // Admin has full access

        // Check if the current path is in the allowed list
        let allowed = false;
        for (const p of perms) {
            if (path.includes(p)) {
                allowed = true;
                break;
            }
        }
        
        // Bypass for profil
        if (path.includes('profil.html')) allowed = true;

        if (!allowed) {
            alert('Accès refusé. Vous n\'avez pas la permission de voir cette page.');
            
            // Redirect to appropriate dashboard
            if (role === 'enseignant') window.location.href = 'enseignant.html';
            else if (role === 'parent') window.location.href = 'parent.html';
            else if (role === 'eleve') window.location.href = 'eleve.html';
            else window.location.href = 'index.html';
        }
    } catch(e) {
        console.error('Session error', e);
        window.location.href = '../signin.html';
    }
}

// Run immediately
checkAccess();
