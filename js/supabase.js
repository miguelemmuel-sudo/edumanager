/* ==============================================
   EduManager – Client Supabase (Securise)
   
   OWASP A01:2021 – Broken Access Control
   OWASP A03:2021 – Injection
   -----------------------------------------
   Toutes les operations verifient :
   1. L'authentification (utilisateur connecte)
   2. Les permissions (role via profil)
   3. La sanitisation des inputs
   ============================================== */

'use strict';

// Les cles sont chargees depuis config.js (inclus avant ce fichier)
const SUPABASE_URL      = (window.EDUMANAGER_CONFIG && window.EDUMANAGER_CONFIG.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.EDUMANAGER_CONFIG && window.EDUMANAGER_CONFIG.SUPABASE_ANON_KEY) || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[EduManager] Configuration manquante. Incluez config.js avant supabase.js.');
}

// Client Supabase (charge via CDN dans le HTML)
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.warn('[EduManager] Supabase client non disponible. Incluez le CDN Supabase dans votre HTML.');
}

/* ==============================================
   HELPERS SECURITE
   ============================================== */

/** Verifie que l'utilisateur est authentifie et retourne son objet user */
async function _requireAuth() {
  if (!supabase) throw new Error('Supabase non connecte.');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Non authentifie.');
  return user;
}

/** Verifie que l'utilisateur a un role specifique */
async function _requireRole(allowedRoles) {
  const user = await _requireAuth();
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (error || !profile) throw new Error('Profil introuvable.');
  if (!allowedRoles.includes(profile.role)) {
    // Log de securite : tentative d'acces non autorise
    _logSecurityEvent('UNAUTHORIZED_ACCESS', {
      user_id: user.id,
      required_roles: allowedRoles,
      actual_role: profile.role
    });
    throw new Error('Permissions insuffisantes.');
  }
  return { user, profile };
}

/** Sanitise une chaine avant insertion en BDD */
function _sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/<[^>]*>/g, '');
}

/** Log securite interne (ne bloque pas le flux) */
async function _logSecurityEvent(eventType, metadata) {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert({
      user_id:    metadata?.user_id || null,
      event_type: eventType,
      user_agent: navigator.userAgent.substring(0, 255),
      metadata:   metadata || {},
    });
  } catch (_) { /* echec silencieux */ }
}

/* ==============================================
   AUTHENTIFICATION
   ============================================== */

async function supabaseRegister(data) {
  if (!supabase) return { success: false, message: 'Supabase non connecte.' };
  try {
    // Sanitisation des inputs
    const cleanData = {
      email:    _sanitize(data.email),
      password: data.password, // Le mot de passe n'est pas sanitise (hash par Supabase)
      prenom:   _sanitize(data.prenom),
      nom:      _sanitize(data.nom),
      role:     _sanitize(data.role) || 'student',
      tel:      _sanitize(data.tel) || null,
      adresse:  _sanitize(data.adresse) || null,
    };

    // Validation email
    if (window.EduSecurity && !window.EduSecurity.isValidEmail(cleanData.email)) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Validation mot de passe
    if (window.EduSecurity && !window.EduSecurity.isStrongPassword(cleanData.password)) {
      return { success: false, message: 'Le mot de passe doit contenir min. 8 caracteres, une majuscule, une minuscule et un chiffre.' };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanData.email,
      password: cleanData.password,
      options: { data: { first_name: cleanData.prenom, last_name: cleanData.nom } }
    });
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error('Utilisateur non cree.');
    const { error: profileError } = await supabase.from('profiles').insert({
      id:         userId,
      role:       cleanData.role,
      first_name: cleanData.prenom,
      last_name:  cleanData.nom,
      phone:      cleanData.tel,
      address:    cleanData.adresse,
    });
    if (profileError) throw profileError;

    // Log d'audit
    await _logSecurityEvent('USER_REGISTERED', { user_id: userId, email: cleanData.email });

    return { success: true, user: authData.user };
  } catch (err) {
    console.error('[supabaseRegister]', err);
    return { success: false, message: err.message || 'Erreur lors de l inscription.' };
  }
}

async function supabaseLogin(email, password) {
  if (!supabase) return { success: false, message: 'Supabase non connecte.' };

  // Rate limiting cote client (filet de securite — le vrai rate limiting est cote serveur)
  if (window.EduSecurity && window.EduSecurity.isRateLimited()) {
    return { success: false, message: window.EduSecurity.getRateLimitMessage() };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: _sanitize(email),
      password: password
    });
    if (error) {
      if (window.EduSecurity) window.EduSecurity.recordFailedAttempt();
      await _logSecurityEvent('LOGIN_FAILED', { email: _sanitize(email) });
      throw error;
    }

    if (window.EduSecurity) window.EduSecurity.resetRateLimit();
    await _logSecurityEvent('LOGIN_SUCCESS', { user_id: data.user.id });

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    console.error('[supabaseLogin]', err);
    return { success: false, message: err.message || 'Email ou mot de passe incorrect.' };
  }
}

async function supabaseLogout() {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await _logSecurityEvent('LOGOUT', { user_id: user?.id });
  } catch (_) { /* pas grave */ }
  await supabase.auth.signOut();
  // Nettoyer les donnees sensibles du localStorage
  localStorage.removeItem('edu_session');
  localStorage.removeItem('edu_last_active');
  window.location.href = '../signin.html';
}

async function supabaseGetCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

async function supabaseGetProfile(userId) {
  if (!supabase) return null;
  // Sanitise l'ID pour eviter les injections
  const cleanId = _sanitize(userId);
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', cleanId).single();
  if (error) { console.error('[supabaseGetProfile]', error); return null; }
  return data;
}

async function supabaseUpdateProfile(updates) {
  if (!supabase) return { success: false, message: 'Supabase non connecte.' };
  const user = await _requireAuth();
  // Sanitiser chaque champ mis a jour
  const cleanUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    // Empecher la modification du role par un non-admin
    if (key === 'role' || key === 'id') continue;
    cleanUpdates[key] = typeof value === 'string' ? _sanitize(value) : value;
  }
  const { error } = await supabase.from('profiles').update(cleanUpdates).eq('id', user.id);
  if (error) return { success: false, message: error.message };

  await _logSecurityEvent('PROFILE_UPDATED', { user_id: user.id, fields: Object.keys(cleanUpdates) });
  return { success: true };
}

/* ==============================================
   COURS
   ============================================== */

async function supabaseGetCourses() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('courses').select('*, profiles(first_name, last_name)');
  if (error) { console.error('[supabaseGetCourses]', error); return []; }
  return data || [];
}

async function supabaseCreateCourse(courseData) {
  if (!supabase) return { success: false };
  // Verification : seuls les enseignants et admins peuvent creer un cours
  const { user } = await _requireRole(['teacher', 'admin']);
  const cleanData = {};
  for (const [key, value] of Object.entries(courseData)) {
    cleanData[key] = typeof value === 'string' ? _sanitize(value) : value;
  }
  const { data, error } = await supabase
    .from('courses').insert({ ...cleanData, teacher_id: user.id }).select().single();
  if (error) return { success: false, message: error.message };

  await _logSecurityEvent('COURSE_CREATED', { user_id: user.id, course_id: data.id });
  return { success: true, course: data };
}

/* ==============================================
   INSCRIPTIONS (Enrollments)
   ============================================== */

async function supabaseGetMyEnrollments() {
  if (!supabase) return [];
  const user = await _requireAuth().catch(() => null);
  if (!user) return [];
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(title, description)')
    .eq('student_id', user.id);
  if (error) { console.error('[supabaseGetMyEnrollments]', error); return []; }
  return data || [];
}

async function supabaseEnroll(courseId) {
  if (!supabase) return { success: false };
  const user = await _requireAuth();
  const cleanCourseId = _sanitize(courseId);
  const { error } = await supabase.from('enrollments')
    .insert({ student_id: user.id, course_id: cleanCourseId });
  if (error) return { success: false, message: error.message };

  await _logSecurityEvent('ENROLLMENT', { user_id: user.id, course_id: cleanCourseId });
  return { success: true };
}

/* ==============================================
   NOTES (Grades)
   ============================================== */

async function supabaseGetMyGrades() {
  if (!supabase) return [];
  await _requireAuth();
  const { data, error } = await supabase
    .from('grades')
    .select('*, assignments(title, due_date, courses(title))');
  if (error) { console.error('[supabaseGetMyGrades]', error); return []; }
  return data || [];
}

async function supabaseAddGrade(assignmentId, studentId, score, feedback) {
  if (!supabase) return { success: false };
  // Verification : seuls les enseignants et admins peuvent ajouter des notes
  const { user } = await _requireRole(['teacher', 'admin']);

  // Validation du score
  const numScore = Number(score);
  if (isNaN(numScore) || numScore < 0 || numScore > 20) {
    return { success: false, message: 'La note doit etre entre 0 et 20.' };
  }

  const { error } = await supabase.from('grades').upsert({
    assignment_id: _sanitize(assignmentId),
    student_id:    _sanitize(studentId),
    score:         numScore,
    feedback:      _sanitize(feedback) || ''
  }, { onConflict: 'assignment_id,student_id' });
  if (error) return { success: false, message: error.message };

  await _logSecurityEvent('GRADE_ADDED', {
    user_id: user.id, student_id: _sanitize(studentId),
    assignment_id: _sanitize(assignmentId), score: numScore
  });
  return { success: true };
}

/* ==============================================
   LECONS & DEVOIRS
   ============================================== */

async function supabaseGetLessons(courseId) {
  if (!supabase) return [];
  await _requireAuth();
  const { data, error } = await supabase
    .from('lessons').select('*').eq('course_id', _sanitize(courseId))
    .order('created_at', { ascending: true });
  if (error) { console.error('[supabaseGetLessons]', error); return []; }
  return data || [];
}

async function supabaseGetAssignments(courseId) {
  if (!supabase) return [];
  await _requireAuth();
  const { data, error } = await supabase
    .from('assignments').select('*, lessons(title)')
    .eq('course_id', _sanitize(courseId)).order('due_date', { ascending: true });
  if (error) { console.error('[supabaseGetAssignments]', error); return []; }
  return data || [];
}

/* ==============================================
   EXPORT GLOBAL
   ============================================== */
window.SupabaseEdu = {
  client:           supabase,
  register:         supabaseRegister,
  login:            supabaseLogin,
  logout:           supabaseLogout,
  getCurrentUser:   supabaseGetCurrentUser,
  getProfile:       supabaseGetProfile,
  updateProfile:    supabaseUpdateProfile,
  getCourses:       supabaseGetCourses,
  createCourse:     supabaseCreateCourse,
  getMyEnrollments: supabaseGetMyEnrollments,
  enroll:           supabaseEnroll,
  getMyGrades:      supabaseGetMyGrades,
  addGrade:         supabaseAddGrade,
  getLessons:       supabaseGetLessons,
  getAssignments:   supabaseGetAssignments,
};
