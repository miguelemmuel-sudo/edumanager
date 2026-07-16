/* ==============================================
   EduManager – Systeme d'authentification
   Base sur localStorage (mode demo) + Supabase Auth
   
   OWASP A01:2021 – Broken Access Control
   OWASP A07:2021 – Identification & Auth Failures
============================================== */

'use strict';

/* ==========================================
   PLANS & PERMISSIONS
========================================== */
const PLANS = {
  starter: {
    label: 'Starter',
    price: '15€/mois',
    color: '#64748B',
    maxEleves: 300,
    features: ['eleves', 'notes', 'paiements', 'bulletins'],
    blocked:  ['enseignants', 'classes', 'emploi-du-temps', 'messages',
               'notifications', 'utilisateurs', 'rapports'],
    description: 'Jusqu\'à 300 élèves — Gestion de base'
  },
  standard: {
    label: 'Standard',
    price: '35€/mois',
    color: '#2563EB',
    maxEleves: 1000,
    features: ['eleves', 'enseignants', 'classes', 'notes', 'paiements',
               'bulletins', 'emploi-du-temps', 'messages', 'notifications', 'rapports'],
    blocked:  ['utilisateurs'],
    description: 'Jusqu\'à 1 000 élèves — Toutes les fonctionnalités'
  },
  premium: {
    label: 'Premium',
    price: '80€/mois',
    color: '#10B981',
    maxEleves: Infinity,
    features: ['eleves', 'enseignants', 'classes', 'notes', 'paiements',
               'bulletins', 'emploi-du-temps', 'messages', 'notifications',
               'utilisateurs', 'rapports', 'parametres'],
    blocked:  [],
    description: 'Élèves illimités — Toutes les fonctionnalités + App mobile'
  }
};

/* ==========================================
   STOCKAGE
========================================== */
function getUsers() {
  return JSON.parse(localStorage.getItem('edu_users') || '[]');
}
function saveUsers(users) {
  localStorage.setItem('edu_users', JSON.stringify(users));
}
function getSession() {
  return JSON.parse(localStorage.getItem('edu_session') || 'null');
}
function saveSession(session) {
  localStorage.setItem('edu_session', JSON.stringify(session));
}
function clearSession() {
  localStorage.removeItem('edu_session');
}

/* ==========================================
   INSCRIPTION
========================================== */
function register(data) {
  const _s = window.EduSecurity ? window.EduSecurity.sanitizeInput : function(v) { return String(v||'').trim(); };
  const users = getUsers();
  const cleanEmail = _s(data.email).toLowerCase();

  // Validation email
  if (window.EduSecurity && !window.EduSecurity.isValidEmail(cleanEmail)) {
    return { success: false, message: 'Adresse email invalide.' };
  }
  // Verifier si email deja utilise
  if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, message: 'Un compte avec cet email existe deja.' };
  }
  // SECURITE : Ne JAMAIS stocker le mot de passe en clair dans localStorage
  // L'authentification reelle est geree par Supabase Auth
  const user = {
    id:           'EDU-' + Date.now(),
    email:        cleanEmail,
    // password: SUPPRIME INTENTIONNELLEMENT – utiliser Supabase Auth
    prenom:       _s(data.prenom),
    nom:          _s(data.nom),
    fonction:     _s(data.fonction) || 'Directeur',
    ecole:        _s(data.ecole),
    typeEcole:    _s(data.typeEcole) || '',
    pays:         _s(data.pays) || '',
    ville:        _s(data.ville) || '',
    tel:          _s(data.tel) || '',
    plan:         _s(data.plan) || 'starter',
    role:         'admin', // Le createur du compte est admin par defaut
    createdAt:    new Date().toISOString(),
    trialEnd:     new Date(Date.now() + 30*24*60*60*1000).toISOString()
  };
  users.push(user);
  saveUsers(users);
  // Creer la session automatiquement avec fingerprint de securite
  const session = { userId: user.id, email: user.email, plan: user.plan, role: user.role };
  if (window.EduSecurity) {
    window.EduSecurity.saveSecureSession(session);
    window.EduSecurity.logSecurityEvent('USER_REGISTERED_LOCAL', { email: cleanEmail });
  } else {
    saveSession(session);
  }
  return { success: true, user };
}

/* ==========================================
   CONNEXION
========================================== */
function login(email, password) {
  const _s = window.EduSecurity ? window.EduSecurity.sanitizeInput : function(v) { return String(v||'').trim(); };
  // SECURITE : Verifier le rate limiting avant toute tentative
  if (window.EduSecurity && window.EduSecurity.isRateLimited()) {
    return { success: false, message: window.EduSecurity.getRateLimitMessage() };
  }
  const users = getUsers();
  const cleanEmail = _s(email).toLowerCase();
  // SECURITE : Les mots de passe ne sont plus stockes en localStorage.
  // Ce mode demo accepte toute connexion si l'email existe (Supabase Auth est utilise en priorite).
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    if (window.EduSecurity) {
      window.EduSecurity.recordFailedAttempt();
      window.EduSecurity.logSecurityEvent('LOGIN_FAILED_LOCAL', { email: cleanEmail });
    }
    return { success: false, message: 'Email ou mot de passe incorrect.' };
  }
  if (window.EduSecurity) window.EduSecurity.resetRateLimit();
  // Session securisee avec fingerprint
  const session = { userId: user.id, email: user.email, plan: user.plan, role: user.role || 'admin' };
  if (window.EduSecurity) {
    window.EduSecurity.saveSecureSession(session);
    window.EduSecurity.logSecurityEvent('LOGIN_SUCCESS_LOCAL', { email: cleanEmail });
  } else {
    saveSession(session);
  }
  return { success: true, user };
}

/* ==========================================
   DÉCONNEXION
========================================== */
function logout() {
  if (window.EduSecurity) {
    window.EduSecurity.logSecurityEvent('LOGOUT_LOCAL', {});
  }
  clearSession();
  // Nettoyer aussi le rate limit et les donnees sensibles
  localStorage.removeItem('edu_rl_login');
  localStorage.removeItem('edu_last_active');
  sessionStorage.removeItem('edu_csrf');
  window.location.href = '../signin.html';
}

/* ==========================================
   CHANGER LE MOT DE PASSE
========================================== */
function changePassword(oldPassword, newPassword) {
  // SECURITE : Le changement de mot de passe est delégué à Supabase Auth.
  // Cette fonction démo ne gère plus les mots de passe en localStorage.
  // Utiliser SupabaseEdu.client.auth.updateUser({ password: newPassword })
  if (!window.SupabaseEdu) {
    return { success: false, message: 'Service d\'authentification non disponible.' };
  }
  // Validation de la complexite
  if (window.EduSecurity && !window.EduSecurity.isStrongPassword(newPassword)) {
    return { success: false, message: 'Le mot de passe doit contenir min. 8 caractères, une majuscule, une minuscule et un chiffre.' };
  }
  return { success: true, message: 'Utilisez la fonction Supabase pour changer votre mot de passe.' };
}

/* ==========================================
   OBTENIR L'UTILISATEUR CONNECTÉ
========================================== */
function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
}

/* ==========================================
   VÉRIFIER L'ACCÈS À UNE PAGE
========================================== */
function checkAccess(page) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '../signin.html';
    return false;
  }

  // SECURITE : Verifier l'integrite de la session
  if (window.EduSecurity && !window.EduSecurity.verifySessionIntegrity()) {
    window.EduSecurity.logSecurityEvent('SESSION_TAMPER_CHECKACCESS', { page: page });
    clearSession();
    window.location.href = '../signin.html?reason=security';
    return false;
  }

  // SECURITE : Pages reservees aux admins
  const ADMIN_PAGES = (window.EDUMANAGER_CONFIG && window.EDUMANAGER_CONFIG.ADMIN_ONLY_PAGES) || ['utilisateurs', 'parametres'];
  if (ADMIN_PAGES.includes(page)) {
    const userRole = user.role || 'admin';
    if (userRole !== 'admin') {
      if (window.EduSecurity) {
        window.EduSecurity.logSecurityEvent('ADMIN_PAGE_BLOCKED', { page: page, role: userRole });
      }
      showUpgradeWall(user.plan, page);
      return false;
    }
  }

  const plan = PLANS[user.plan];
  if (!plan) return true;
  if (plan.blocked.includes(page)) {
    showUpgradeWall(user.plan, page);
    return false;
  }
  return true;
}

/* ==========================================
   MUR D'UPGRADE (page bloquée)
========================================== */
function showUpgradeWall(currentPlan, page) {
  const plan = PLANS[currentPlan];
  const pageLabels = {
    'enseignants':   'Gestion des enseignants',
    'classes':       'Gestion des classes',
    'emploi-du-temps': 'Emplois du temps',
    'messages':      'Messagerie',
    'notifications': 'Notifications avancées',
    'utilisateurs':  'Gestion des utilisateurs',
    'rapports':      'Rapports & Statistiques'
  };
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;max-width:480px;padding:2rem">
        <div style="width:80px;height:80px;background:rgba(37,99,235,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem">
          <i class="fas fa-lock" style="font-size:2rem;color:#2563EB"></i>
        </div>
        <h3 style="font-weight:800;color:#1E293B;margin-bottom:.5rem">Fonctionnalité non disponible</h3>
        <p style="color:#64748B;margin-bottom:.5rem">
          <strong>${pageLabels[page] || page}</strong> n'est pas inclus dans votre plan
          <span style="background:${plan.color};color:white;padding:2px 10px;border-radius:50px;font-size:.75rem;font-weight:700;margin-left:6px">${plan.label}</span>
        </p>
        <p style="color:#94A3B8;font-size:.875rem;margin-bottom:2rem">${plan.description}</p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem">
          <div style="font-weight:700;color:#1E293B;margin-bottom:1rem">Passez à un plan supérieur</div>
          ${currentPlan === 'starter' ? `
            <div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">
              <div style="flex:1;min-width:140px;border:2px solid #2563EB;border-radius:.75rem;padding:1rem;text-align:center">
                <div style="font-weight:700;color:#2563EB">Standard</div>
                <div style="font-size:1.4rem;font-weight:800;color:#1E293B">35€<span style="font-size:.75rem;color:#64748B">/mois</span></div>
                <div style="font-size:.75rem;color:#64748B;margin-bottom:.75rem">1 000 élèves max</div>
                <button onclick="upgradePlan('standard')" style="background:#2563EB;color:white;border:none;border-radius:50px;padding:6px 18px;font-size:.8rem;font-weight:600;cursor:pointer;width:100%">Choisir</button>
              </div>
              <div style="flex:1;min-width:140px;border:2px solid #10B981;border-radius:.75rem;padding:1rem;text-align:center">
                <div style="font-weight:700;color:#10B981">Premium</div>
                <div style="font-size:1.4rem;font-weight:800;color:#1E293B">80€<span style="font-size:.75rem;color:#64748B">/mois</span></div>
                <div style="font-size:.75rem;color:#64748B;margin-bottom:.75rem">Illimité + App</div>
                <button onclick="upgradePlan('premium')" style="background:#10B981;color:white;border:none;border-radius:50px;padding:6px 18px;font-size:.8rem;font-weight:600;cursor:pointer;width:100%">Choisir</button>
              </div>
            </div>` : `
            <div style="border:2px solid #10B981;border-radius:.75rem;padding:1rem;text-align:center;max-width:200px;margin:0 auto">
              <div style="font-weight:700;color:#10B981">Premium</div>
              <div style="font-size:1.4rem;font-weight:800;color:#1E293B">80€<span style="font-size:.75rem;color:#64748B">/mois</span></div>
              <div style="font-size:.75rem;color:#64748B;margin-bottom:.75rem">Élèves illimités + App</div>
              <button onclick="upgradePlan('premium')" style="background:#10B981;color:white;border:none;border-radius:50px;padding:6px 18px;font-size:.8rem;font-weight:600;cursor:pointer;width:100%">Passer au Premium</button>
            </div>`}
        </div>
        <a href="index.html" style="color:#2563EB;font-size:.875rem;text-decoration:none">
          <i class="fas fa-arrow-left" style="margin-right:6px"></i>Retour au tableau de bord
        </a>
      </div>
    </div>`;
}

/* ==========================================
   CHANGER DE PLAN (simulation)
========================================== */
function upgradePlan(newPlan) {
  const session = getSession();
  if (!session) return;
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === session.userId);
  if (idx === -1) return;
  users[idx].plan  = newPlan;
  session.plan     = newPlan;
  saveUsers(users);
  saveSession(session);
  alert(`✅ Votre plan a été mis à jour vers ${PLANS[newPlan].label} ! La page va se recharger.`);
  window.location.reload();
}

/* ==========================================
   INJECTER LES INFOS UTILISATEUR DANS LE DASHBOARD
========================================== */
function injectUserInfo() {
  const user = getCurrentUser();
  if (!user) return;
  const plan = PLANS[user.plan] || PLANS.starter;

  // Avatar + nom dans sidebar
  document.querySelectorAll('.user-av').forEach(el => {
    el.textContent = (user.prenom || 'D').charAt(0).toUpperCase();
    el.style.background = plan.color;
  });
  document.querySelectorAll('.user-name').forEach(el => {
    el.textContent = (user.prenom || '') + ' ' + (user.nom || '');
  });
  document.querySelectorAll('.user-role').forEach(el => {
    el.textContent = user.fonction || 'Administrateur';
  });

  // Badge plan dans la topbar
  const actions = document.querySelector('.topbar-actions');
  if (actions && !document.getElementById('planBadge')) {
    const badge = document.createElement('span');
    badge.id = 'planBadge';
    badge.innerHTML = `<span style="background:${plan.color};color:white;padding:3px 10px;border-radius:50px;font-size:.72rem;font-weight:700;cursor:pointer" title="Plan actuel" onclick="window.location.href='parametres.html'">${plan.label}</span>`;
    actions.insertBefore(badge, actions.firstChild);
  }

  // Griser les liens bloqués dans la sidebar
  plan.blocked.forEach(page => {
    const link = document.querySelector(`.nav-item-link[href="${page}.html"]`);
    if (link) {
      link.style.opacity = '.45';
      link.style.pointerEvents = 'none';
      link.style.cursor = 'not-allowed';
      const label = link.querySelector('.nav-item-label');
      if (label) {
        const lock = document.createElement('i');
        lock.className = 'fas fa-lock';
        lock.style.cssText = 'font-size:.65rem;margin-left:auto;opacity:.6';
        link.appendChild(lock);
      }
      // Rendre cliquable pour montrer le mur d'upgrade
      link.style.pointerEvents = 'auto';
      link.style.cursor = 'pointer';
      link.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = page + '.html';
      });
    }
  });

  // Greeting personnalisé
  const greeting = document.querySelector('.page-subtitle, .page-header p');
  if (greeting && greeting.textContent.includes('Directeur')) {
    greeting.textContent = greeting.textContent.replace(
      'Directeur', user.prenom || user.fonction || 'Directeur'
    );
  }

  // Nom de l'école dans la sidebar brand
  const brand = document.querySelector('.brand-name');
  if (brand && user.ecole) {
    brand.title = user.ecole;
  }
}

/* ==========================================
   INITIALISATION AU CHARGEMENT DE PAGE
========================================== */
(function init() {
  // Si on est sur une page du dashboard
  const isDashboard = window.location.pathname.includes('/dashboard/');
  if (!isDashboard) return;

  const user = getCurrentUser();

  // Pas connecté → rediriger
  if (!user) {
    window.location.href = '../signin.html';
    return;
  }

  // Détecter la page actuelle
  const page = window.location.pathname.split('/').pop().replace('.html','');
  const plan = PLANS[user.plan] || PLANS.starter;

  // Vérifier si la page est bloquée
  if (plan.blocked.includes(page)) {
    // Laisser la page charger puis afficher le mur
    document.addEventListener('DOMContentLoaded', () => {
      injectUserInfo();
      showUpgradeWall(user.plan, page);
    });
    return;
  }

  // Injecter les infos utilisateur
  document.addEventListener('DOMContentLoaded', injectUserInfo);
})();
