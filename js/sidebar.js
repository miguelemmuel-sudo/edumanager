
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

    function getBasePath() {
    const p = window.location.pathname;
    const idx = p.indexOf('/dashboard');
    if (idx >= 0) return p.substring(0, idx) + '/dashboard/';
    return '/dashboard/';
}

const menuItems = [];

    // Dashboard Base
    if (['admin', 'secretaire', 'surveillant'].includes(role)) {
        menuItems.push({ label: 'Tableau de bord', icon: 'fa-th-large', link: 'index.html', section: 'Principal' });
    }

    // Gestion
    if (['admin', 'secretaire', 'surveillant'].includes(role)) {
        menuItems.push({ label: 'Élèves', icon: 'fa-user-graduate', link: 'eleves.html', section: 'Gestion' });
        menuItems.push({ label: 'Enseignants', icon: 'fa-chalkboard-teacher', link: 'enseignants.html', section: 'Gestion' });
        menuItems.push({ label: 'Classes', icon: 'fa-door-open', link: 'classes.html', section: 'Gestion' });
        menuItems.push({ label: 'Notes', icon: 'fa-clipboard-list', link: 'notes.html', section: 'Gestion' });
        menuItems.push({ label: 'Bulletins', icon: 'fa-file-alt', link: 'bulletins.html', section: 'Gestion' });
        menuItems.push({ label: 'Emplois du temps', icon: 'fa-calendar-alt', link: 'emploi-du-temps.html', section: 'Gestion' });
    } else if (role === 'enseignant') {
        menuItems.push({ label: 'Mes Classes', icon: 'fa-door-open', link: 'classes.html', section: 'Gestion' });
        menuItems.push({ label: 'Mes Matières', icon: 'fa-book-open', link: 'mes-matieres.html', section: 'Gestion' });
        menuItems.push({ label: 'Notes', icon: 'fa-clipboard-list', link: 'notes.html', section: 'Gestion' });
        menuItems.push({ label: 'Bulletins', icon: 'fa-file-alt', link: 'bulletins.html', section: 'Gestion' });
        menuItems.push({ label: 'Emplois du temps', icon: 'fa-calendar-alt', link: 'emploi-du-temps.html', section: 'Gestion' });
    } else if (role === 'comptable') {
        menuItems.push({ label: 'Élèves', icon: 'fa-user-graduate', link: 'eleves.html', section: 'Gestion' });
    } else if (role === 'parent') {
        menuItems.push({ label: 'Mes Enfants', icon: 'fa-user-graduate', link: 'eleves.html', section: 'Gestion' });
        menuItems.push({ label: 'Notes', icon: 'fa-clipboard-list', link: 'notes.html', section: 'Gestion' });
        menuItems.push({ label: 'Bulletins', icon: 'fa-file-alt', link: 'bulletins.html', section: 'Gestion' });
        menuItems.push({ label: 'Emploi du temps', icon: 'fa-calendar-alt', link: 'emploi-du-temps.html', section: 'Gestion' });
    } else if (role === 'eleve') {
        menuItems.push({ label: 'Mes Notes', icon: 'fa-clipboard-list', link: 'notes.html', section: 'Gestion' });
        menuItems.push({ label: 'Mes Bulletins', icon: 'fa-file-alt', link: 'bulletins.html', section: 'Gestion' });
        menuItems.push({ label: 'Mon Emploi du temps', icon: 'fa-calendar-alt', link: 'emploi-du-temps.html', section: 'Gestion' });
    }

    // Finance
    if (['admin', 'secretaire'].includes(role)) {
        menuItems.push({ label: 'Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance', badge: '0', badgeClass: 'bg-danger-soft text-danger', badgeId: 'sidebarBadgePaiements' });
    } else if (role === 'comptable') {
        menuItems.push({ label: 'Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance', badge: '0', badgeClass: 'bg-danger-soft text-danger', badgeId: 'sidebarBadgePaiements' });
        menuItems.push({ label: 'Reçus', icon: 'fa-receipt', link: 'paiements.html', section: 'Finance' });
        menuItems.push({ label: 'Rapports financiers', icon: 'fa-chart-pie', link: 'rapports.html', section: 'Finance' });
    } else if (role === 'parent') {
        menuItems.push({ label: 'Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance' });
    } else if (role === 'eleve') {
        menuItems.push({ label: 'Mes Paiements', icon: 'fa-credit-card', link: 'paiements.html', section: 'Finance' });
    }

    // Communication (Tous les rôles ont accès)
    menuItems.push({ label: 'Messages', icon: 'fa-comments', link: 'messages.html', section: 'Communication', badge: '0', badgeClass: 'bg-primary-soft text-primary', badgeId: 'sidebarBadgeMessages' });
    menuItems.push({ label: 'Notifications', icon: 'fa-bell', link: 'notifications.html', section: 'Communication' });

    // Administration / Paramètres
    if (['admin', 'secretaire'].includes(role)) {
        menuItems.push({ label: 'Utilisateurs', icon: 'fa-users-cog', link: 'utilisateurs.html', section: 'Administration' });
        menuItems.push({ label: 'Rapports', icon: 'fa-chart-line', link: 'rapports.html', section: 'Administration' });
        menuItems.push({ label: 'Paramètres', icon: 'fa-cog', link: 'parametres.html', section: 'Administration' });
    }

    let menuHTML = `<div class="sidebar-nav">`;
    let currentSection = '';
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const basePath = getBasePath();

    menuItems.forEach(item => {
        if (item.section !== currentSection) {
            menuHTML += `<div class="nav-section-label mt-2">${item.section}</div>`;
            currentSection = item.section;
        }
        
        let active = (currentPage === item.link) ? 'active' : '';
        let badgeHTML = item.badge ? `<span class="nav-badge ${item.badgeClass}" ${item.badgeId ? 'id="'+item.badgeId+'"' : ''}>${item.badge}</span>` : '';
        
        menuHTML += `
            <a href="${basePath}${item.link}" class="nav-item-link ${active}">
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
            <a href="${basePath}index.html" class="sidebar-brand">
                <i class="fas fa-graduation-cap brand-icon"></i>
                <span class="brand-name">EduManager</span>
            </a>
            ${menuHTML}
            <div class="sidebar-footer">
                <div class="user-info" onclick="window.location.href='${basePath}parametres.html'" style="cursor:pointer">
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
