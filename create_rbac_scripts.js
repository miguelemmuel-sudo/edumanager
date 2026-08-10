const fs = require('fs');
const path = require('path');

const securityJsContent = `
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
        if (path.endsWith('/dashboard/') || path.endsWith('/dashboard/index.html')) {
            if (role === 'enseignant') {
                window.location.href = '/dashboard/enseignant.html';
                return;
            } else if (role === 'parent') {
                window.location.href = '/dashboard/parent.html';
                return;
            } else if (role === 'eleve') {
                window.location.href = '/dashboard/eleve.html';
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
            alert('Accès refusé. Vous n\\'avez pas la permission de voir cette page.');
            
            // Redirect to appropriate dashboard
            if (role === 'enseignant') window.location.href = '/dashboard/enseignant.html';
            else if (role === 'parent') window.location.href = '/dashboard/parent.html';
            else if (role === 'eleve') window.location.href = '/dashboard/eleve.html';
            else window.location.href = '/dashboard/index.html';
        }
    } catch(e) {
        console.error('Session error', e);
        window.location.href = '../signin.html';
    }
}

// Run immediately
checkAccess();
`;

const sidebarJsContent = `
/* ==============================================
   EduManager – Dynamic Sidebar & Menu Render
============================================== */

function renderSidebar() {
    const sessionStr = localStorage.getItem('edu_session');
    let role = 'admin';
    let userName = 'Utilisateur';
    let userInitial = 'U';
    let roleDisplay = 'Administrateur';
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            role = (session.role || 'admin').toLowerCase();
            if (role.includes('directeur')) role = 'admin';
            if (role.includes('gestionnaire')) role = 'comptable';
            
            roleDisplay = session.role || 'Administrateur';
            userName = session.email ? session.email.split('@')[0] : 'Utilisateur';
            userInitial = userName.charAt(0).toUpperCase();
        } catch(e){}
    }

    const menuItems = [];

    // Dashboard Base
    if (role === 'admin' || role === 'secretaire' || role === 'surveillant' || role === 'comptable') {
        menuItems.push({ label: 'Tableau de bord', icon: 'fa-th-large', link: 'index.html', section: 'Principal' });
    } else if (role === 'enseignant') {
        menuItems.push({ label: 'Tableau de bord', icon: 'fa-th-large', link: 'enseignant.html', section: 'Principal' });
    } else if (role === 'parent') {
        menuItems.push({ label: 'Tableau de bord', icon: 'fa-th-large', link: 'parent.html', section: 'Principal' });
    } else if (role === 'eleve') {
        menuItems.push({ label: 'Tableau de bord', icon: 'fa-th-large', link: 'eleve.html', section: 'Principal' });
    }

    // Gestion
    if (['admin', 'secretaire'].includes(role)) {
        menuItems.push({ label: 'Élèves', icon: 'fa-user-graduate', link: 'eleves.html', section: 'Gestion' });
    }
    if (['admin'].includes(role)) {
        menuItems.push({ label: 'Enseignants', icon: 'fa-chalkboard-teacher', link: 'enseignants.html', section: 'Gestion' });
    }
    if (['admin', 'enseignant', 'secretaire'].includes(role)) {
        menuItems.push({ label: 'Classes', icon: 'fa-door-open', link: 'classes.html', section: 'Gestion' });
    }
    if (['admin', 'enseignant', 'parent', 'eleve'].includes(role)) {
        menuItems.push({ label: 'Notes & Bulletins', icon: 'fa-clipboard-list', link: 'notes.html', section: 'Gestion' });
    }
    if (['admin', 'enseignant', 'parent', 'eleve'].includes(role)) {
        menuItems.push({ label: 'Emplois du temps', icon: 'fa-calendar-alt', link: 'emploi-du-temps.html', section: 'Gestion' });
    }

    // Finance
    if (['admin', 'comptable'].includes(role)) {
        menuItems.push({ label: 'Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance', badge: '12', badgeClass: 'bg-danger-soft text-danger' });
    }
    if (['parent'].includes(role)) {
        menuItems.push({ label: 'Mes Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance' });
    }

    // Communication
    menuItems.push({ label: 'Messages', icon: 'fa-comments', link: 'messages.html', section: 'Communication', badge: '5', badgeClass: 'bg-primary-soft text-primary' });
    menuItems.push({ label: 'Notifications', icon: 'fa-bell', link: 'notifications.html', section: 'Communication' });

    // Administration
    if (['admin'].includes(role)) {
        menuItems.push({ label: 'Utilisateurs', icon: 'fa-users-cog', link: 'utilisateurs.html', section: 'Administration' });
    }
    if (['admin', 'comptable'].includes(role)) {
        menuItems.push({ label: 'Rapports', icon: 'fa-chart-line', link: 'rapports.html', section: 'Administration' });
    }
    if (['admin'].includes(role)) {
        menuItems.push({ label: 'Paramètres', icon: 'fa-cog', link: 'parametres.html', section: 'Administration' });
    }

    let menuHTML = \`<div class="sidebar-nav">\`;
    let currentSection = '';
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    menuItems.forEach(item => {
        if (item.section !== currentSection) {
            menuHTML += \`<div class="nav-section-label mt-2">\${item.section}</div>\`;
            currentSection = item.section;
        }
        
        let active = (currentPage === item.link) ? 'active' : '';
        let badgeHTML = item.badge ? \`<span class="nav-badge \${item.badgeClass}">\${item.badge}</span>\` : '';
        
        menuHTML += \`
            <a href="/dashboard/\${item.link}" class="nav-item-link \${active}">
                <i class="fas \${item.icon} nav-icon"></i>
                <span class="nav-item-label">\${item.label}</span>
                \${badgeHTML}
            </a>
        \`;
    });
    
    menuHTML += \`</div>\`;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.innerHTML = \`
            <a href="/dashboard/" class="sidebar-brand">
                <i class="fas fa-graduation-cap brand-icon"></i>
                <span class="brand-name">EduManager</span>
            </a>
            \${menuHTML}
            <div class="sidebar-footer">
                <div class="user-info" onclick="window.location.href='profil.html'" style="cursor:pointer">
                    <div class="user-av">\${userInitial}</div>
                    <div>
                        <div class="user-name">\${userName}</div>
                        <div class="user-role">\${roleDisplay}</div>
                    </div>
                    <i class="fas fa-cog ms-auto text-muted" style="font-size:.7rem"></i>
                </div>
            </div>
        \`;
    }
}

document.addEventListener('DOMContentLoaded', renderSidebar);
`;

fs.writeFileSync('js/security.js', securityJsContent);
fs.writeFileSync('js/sidebar.js', sidebarJsContent);
console.log('Created security.js and sidebar.js');
