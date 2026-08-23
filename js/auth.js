/* ==============================================
   EduManager – Systeme d'authentification 100% Supabase
============================================== */

'use strict';

/* ==========================================
   PLANS
========================================== */
const PLANS = {
  starter: { label: 'Starter', price: 'Gratuit', maxEleves: 300 },
  standard: { label: 'Standard', price: '25 000 FCFA/mois', maxEleves: 1000 },
  premium: { label: 'Premium', price: '35 000 FCFA/mois', maxEleves: 1500 },
  vip: { label: 'VIP', price: 'Sur devis', maxEleves: Infinity }
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
  try {
    if (!window.supabase) {
      return { 
        success: false, 
        message: "Impossible de se connecter au serveur. Votre bloqueur de publicités (AdBlock/Brave) ou votre pare-feu bloque peut-être la connexion. Veuillez le désactiver et recharger la page." 
      };
    }

    // 1. Inscription Auth
    const { data: authData, error: authError } = await window.supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          prenom: data.prenom,
          nom: data.nom,
          fonction: data.fonction,
          role: 'admin',
          ecole: data.ecole,
          typeEcole: data.typeEcole,
          pays: data.pays,
          ville: data.ville,
          tel: data.tel,
          plan: data.plan
        }
      }
    });

    if (authError) return { success: false, message: authError.message };
    if (!authData || !authData.user) return { success: false, message: 'Erreur inconnue lors de l\'inscription.' };

    const userId = authData.user.id;

    // 2. Création de l'établissement et du profil via RPC (Security Definer)
    const { data: rpcData, error: rpcError } = await window.supabase.rpc('create_etablissement_and_profile', {
      p_admin_id: userId,
      p_nom: data.ecole,
      p_type: data.typeEcole,
      p_pays: data.pays,
      p_ville: data.ville,
      p_tel: data.tel,
      p_plan: data.plan,
      p_role: 'admin'
    });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return { success: false, message: "Erreur de configuration Supabase. Assurez-vous que les requêtes SQL (RPC) ont été exécutées." };
    }

    if (rpcData && rpcData.success === false) {
      console.error("RPC Logic Error:", rpcData.error);
      return { success: false, message: "Impossible de créer l'établissement: " + (rpcData.error || '') };
    }

    // Création session locale pour affichage frontend
    const session = { 
      userId: userId, 
      email: data.email, 
      plan: data.plan, 
      role: 'admin',
      etablissement_id: rpcData ? rpcData.etablissement_id : null,
      permissions: ['*'],
      groups: []
    };
    saveSession(session);
    localStorage.setItem('edu_abonnement', data.plan); // Pour la pagination dynamique
    
    return { success: true, user: session };
  } catch(err) {
    console.error("supabaseRegister exception:", err);
    return { success: false, message: "Exception interne: " + err.message };
  }
}

/* ==========================================
   CONNEXION SUPABASE
========================================== */
async function supabaseLogin(email, password) {
  if (!window.supabase) {
    return { 
      success: false, 
      message: "Impossible de se connecter au serveur. Veuillez vérifier votre connexion ou désactiver votre bloqueur de publicités." 
    };
  }

  const { data, error } = await window.supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) return { success: false, message: error.message };

  // Récupérer le profil de l'utilisateur
  const { data: profiles, error: profError } = await window.supabase
    .from('profiles')
    .select('role, etablissement_id, statut')
    .eq('id', data.user.id)
    .limit(1);

  const profile = (profiles && profiles.length > 0) ? profiles[0] : { role: 'admin', etablissement_id: null, statut: 'Actif' };

  if (profile.statut && profile.statut !== 'Actif') {
    await window.supabase.auth.signOut();
    return { success: false, message: `Votre compte est actuellement: ${profile.statut}. Veuillez contacter l'administration.` };
  }

  let plan = 'starter';
  let trialExpired = false;
  if (profile.etablissement_id) {
    const { data: etabs, error: etabError } = await window.supabase
      .from('etablissements')
      .select('plan, date_fin_essai')
      .eq('id', profile.etablissement_id)
      .limit(1);
    if (etabs && etabs.length > 0) {
      plan = etabs[0].plan;
      if (plan === 'starter' && etabs[0].date_fin_essai) {
        if (new Date() > new Date(etabs[0].date_fin_essai)) {
          trialExpired = true;
        }
      }
    }
  } else if (profile.role === 'admin') {
     // Fallback for older admin accounts without profiles table properly set up
     const { data: etabs, error: etabError } = await window.supabase
      .from('etablissements')
      .select('id, plan, date_fin_essai')
      .eq('admin_id', data.user.id)
      .limit(1);
     if (etabs && etabs.length > 0) {
       plan = etabs[0].plan;
       profile.etablissement_id = etabs[0].id;
       if (plan === 'starter' && etabs[0].date_fin_essai) {
         if (new Date() > new Date(etabs[0].date_fin_essai)) {
           trialExpired = true;
         }
       }
     }
  }

  // Fetch user groups and permissions
  let permissions = [];
  let groups = [];
  
  if (profile.role === 'admin') {
    permissions.push('*'); // Admin has full rights
  } else if (profile.etablissement_id) {
    const { data: memberData } = await window.supabase
      .from('user_group_members')
      .select(`
        group_id,
        user_groups ( name, group_permissions ( permissions ( name ) ) )
      `)
      .eq('user_id', data.user.id);
      
    if (memberData) {
      memberData.forEach(member => {
        if (member.user_groups) {
          groups.push(member.user_groups.name);
          if (member.user_groups.group_permissions) {
             member.user_groups.group_permissions.forEach(gp => {
                if (gp.permissions && gp.permissions.name) {
                   permissions.push(gp.permissions.name);
                }
             });
          }
        }
      });
    }
    // Remove duplicate permissions
    permissions = [...new Set(permissions)];
  }

  const session = { 
    userId: data.user.id, 
    email: data.user.email, 
    plan: plan, 
    trialExpired: trialExpired,
    role: profile.role,
    etablissement_id: profile.etablissement_id,
    groups: groups,
    permissions: permissions
  };
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
