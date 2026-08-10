/* ==============================================
   EduManager – Systeme d'authentification 100% Supabase
============================================== */

'use strict';

/* ==========================================
   PLANS
========================================== */
const PLANS = {
  starter: {
    label: 'Starter', price: '15€/mois', maxEleves: 300
  },
  standard: {
    label: 'Standard', price: '35€/mois', maxEleves: 1000
  },
  premium: {
    label: 'Premium', price: '80€/mois', maxEleves: Infinity
  }
};

/* ==========================================
   SESSION & CACHE LOCAL
========================================== */
function getSession() {
  return JSON.parse(localStorage.getItem('edu_session') || 'null');
}

function saveSession(session) {
  if (typeof saveSecureSession === 'function') {
    saveSecureSession(session);
  } else {
    // Fallback if security.js is not loaded
    const raw = JSON.stringify({
      userId: session.userId,
      email:  session.email,
      ua:     navigator.userAgent
    });
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    session._fp = Math.abs(hash).toString(36);
    localStorage.setItem('edu_session', JSON.stringify(session));
  }
}

function clearSession() {
  localStorage.removeItem('edu_session');
  localStorage.removeItem('edu_abonnement');
}

/* ==========================================
   INSCRIPTION SUPABASE
========================================== */
async function supabaseRegister(data) {
  // 1. Inscription Auth
  const { data: authData, error: authError } = await window.supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        prenom: data.prenom,
        nom: data.nom,
        fonction: data.fonction
      }
    }
  });

  if (authError) return { success: false, message: authError.message };
  if (!authData.user) return { success: false, message: 'Erreur inconnue lors de l\'inscription.' };

  const userId = authData.user.id;

  // 2. Création de l'établissement
  const { error: etabError } = await window.supabase.from('etablissements').insert({
    admin_id: userId,
    nom: data.ecole,
    type: data.typeEcole,
    pays: data.pays,
    ville: data.ville,
    tel: data.tel,
    plan: data.plan
  });

  if (etabError) return { success: false, message: etabError.message };

  // Création session locale pour affichage frontend (bien que Supabase gère le token)
  const session = { userId: userId, email: data.email, plan: data.plan, role: 'admin' };
  saveSession(session);
  localStorage.setItem('edu_abonnement', data.plan); // Pour la pagination dynamique
  
  return { success: true, user: session };
}

/* ==========================================
   CONNEXION SUPABASE
========================================== */
async function supabaseLogin(email, password) {
  const { data, error } = await window.supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) return { success: false, message: error.message };

  // Récupérer le plan de l'établissement
  const { data: etabs, error: etabError } = await window.supabase
    .from('etablissements')
    .select('plan')
    .eq('admin_id', data.user.id)
    .limit(1);

  const plan = (etabs && etabs.length > 0) ? etabs[0].plan : 'starter';

  const session = { userId: data.user.id, email: data.user.email, plan: plan, role: 'admin' };
  saveSession(session);
  localStorage.setItem('edu_abonnement', plan);

  return { success: true, user: session };
}

/* ==========================================
   DÉCONNEXION SUPABASE
========================================== */
async function supabaseLogout() {
  await window.supabase.auth.signOut();
  clearSession();
  window.location.href = '/signin.html';
}

/* ==========================================
   RÉCUPÉRATION SESSION ACTIVE SUPABASE
========================================== */
async function checkSupabaseSession() {
  const { data, error } = await window.supabase.auth.getSession();
  if (error || !data.session) {
    clearSession();
    return null;
  }
  return data.session;
}

// Remplacer les anciennes méthodes pour garder la compatibilité si appelé ailleurs,
// mais avertir (tout devrait utiliser les versions async).
window.register = async function(data) { return await supabaseRegister(data); };
window.login = async function(email, pwd) { return await supabaseLogin(email, pwd); };
window.logout = function() { supabaseLogout(); };
window.getSession = getSession;
