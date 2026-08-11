
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

    let menuHTML = `<div class="sidebar-nav">`;
    let currentSection = '';
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    menuItems.forEach(item => {
        if (item.section !== currentSection) {
            menuHTML += `<div class="nav-section-label mt-2">${item.section}</div>`;
            currentSection = item.section;
        }
        
        let active = (currentPage === item.link) ? 'active' : '';
        let badgeHTML = item.badge ? `<span class="nav-badge ${item.badgeClass}">${item.badge}</span>` : '';
        
        menuHTML += `
            <a href="${item.link}" class="nav-item-link ${active}">
                <i class="fas ${item.icon} nav-icon"></i>
                <span class="nav-item-label">${item.label}</span>
                ${badgeHTML}
            </a>
        `;
    });
    
    menuHTML += `</div>`;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.innerHTML = `
            <a href="index.html" class="sidebar-brand">
                <i class="fas fa-graduation-cap brand-icon"></i>
                <span class="brand-name">EduManager</span>
            </a>
            ${menuHTML}
            <div class="sidebar-footer">
                <div class="user-info" onclick="window.location.href='profil.html'" style="cursor:pointer">
                    <div class="user-av">${userInitial}</div>
                    <div>
                        <div class="user-name">${userName}</div>
                        <div class="user-role">${roleDisplay}</div>
                    </div>
                    <i class="fas fa-cog ms-auto text-muted" style="font-size:.7rem"></i>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', renderSidebar);
