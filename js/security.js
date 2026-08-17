/* ==============================================
   EduManager – RBAC Security Middleware
============================================== */

const ROUTE_ROLES = {
    '/dashboard/index.html': ['admin'],
    '/dashboard/paiements.html': ['admin', 'secretaire', 'comptable', 'parent', 'eleve'],
    '/dashboard/rapports.html': ['admin', 'secretaire', 'comptable'],
    '/dashboard/classes.html': ['admin', 'secretaire', 'enseignant', 'surveillant'],
    '/dashboard/eleves.html': ['admin', 'secretaire', 'comptable', 'enseignant', 'surveillant', 'parent'],
    '/dashboard/enseignants.html': ['admin', 'secretaire'],
    '/dashboard/notes.html': ['admin', 'secretaire', 'enseignant', 'eleve', 'parent'],
    '/dashboard/emploi-du-temps.html': ['admin', 'secretaire', 'enseignant', 'eleve', 'parent'],
    '/dashboard/messages.html': [], // accessible to all authenticated
    '/dashboard/notifications.html': [], // accessible to all
    '/dashboard/utilisateurs.html': ['admin', 'secretaire'],
    '/dashboard/parametres.html': ['admin'],
    '/dashboard/profil.html': [] // blocked for everyone
};

function hasPermission(session, permission) {
    if (!session || !session.permissions) return false;
    if (session.permissions.includes('*')) return true;
    return session.permissions.includes(permission);
}

function checkAccess() {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) {
        window.location.href = '../signin.html';
        return;
    }
    
    try {
        const session = JSON.parse(sessionStr);
        let role = (session.role || 'admin').toLowerCase();
        let groups = session.groups || [];
        let permissions = session.permissions || [];
        
        // Normalize role names for fallback
        if (role.includes('directeur')) role = 'admin';
        if (role.includes('gestionnaire')) role = 'comptable';
        
        const path = window.location.pathname.toLowerCase();
        
        // Redirect index.html to specific dashboards if needed
        if (path.endsWith('/dashboard/') || path.endsWith('index.html')) {
            if (groups.includes('Enseignants') || role === 'enseignant') {
                window.location.href = 'enseignant.html';
                return;
            } else if (groups.includes('Parents') || role === 'parent') {
                window.location.href = 'parent.html';
                return;
            } else if (groups.includes('Élèves') || role === 'eleve') {
                window.location.href = 'eleve.html';
                return;
            }
        }

        // Bypass for generic pages
        if (path.includes('enseignant.html') || path.includes('parent.html') || path.includes('eleve.html')) {
            return;
        }

        // Admin has full access
        if (role === 'admin' || permissions.includes('*')) return;

        // Check if the current path requires specific roles
        let allowed = true; // default true for unknown paths
        
        for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
            if (path.includes(route.replace('/dashboard/', ''))) {
                if (allowedRoles.length === 0) {
                    allowed = true; // accessible to all
                } else {
                    allowed = allowedRoles.includes(role);
                }
                break;
            }
        }

        if (!allowed) {
            alert('Accès refusé. Vous n\'avez pas la permission de voir cette page.');
            
            // Redirect to appropriate dashboard
            if (groups.includes('Enseignants') || role === 'enseignant') window.location.href = 'enseignant.html';
            else if (groups.includes('Parents') || role === 'parent') window.location.href = 'parent.html';
            else if (groups.includes('Élèves') || role === 'eleve') window.location.href = 'eleve.html';
            else if (role === 'comptable') window.location.href = 'paiements.html';
            else if (role === 'secretaire') window.location.href = 'eleves.html';
            else window.location.href = 'messages.html';
        }
    } catch(e) {
        console.error('Session error', e);
        window.location.href = '../signin.html';
    }
}

// Global functions for UI conditional rendering
window.hasPermission = function(permission) {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) return false;
    try {
        const session = JSON.parse(sessionStr);
        return hasPermission(session, permission);
    } catch(e) {
        return false;
    }
};

window.hasGroup = function(groupName) {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) return false;
    try {
        const session = JSON.parse(sessionStr);
        return session.groups && session.groups.includes(groupName);
    } catch(e) {
        return false;
    }
};

// Run immediately
checkAccess();
