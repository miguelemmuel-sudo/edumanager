/* =======================================================================
   EduManager – Module de Securite Avance (OWASP Top 10)
   
   Ne pas modifier sans revue de securite.
   
   Couverture OWASP :
   - A01:2021 Broken Access Control    → checkAccess, CSRF
   - A02:2021 Cryptographic Failures   → Session integrity, token gen
   - A03:2021 Injection                → escapeHtml, sanitizeInput
   - A05:2021 Security Misconfiguration → CSP, headers, noindex
   - A07:2021 Cross-Site Scripting     → escapeHtml, DOMPurify-like
   - A08:2021 Software Integrity       → Session tampering detection
   - A09:2021 Logging & Monitoring     → Audit log system
   ======================================================================= */

'use strict';

/* -----------------------------------------------------------------------
   CONFIGURATION (chargee depuis config.js)
   ----------------------------------------------------------------------- */
const _SEC_CONFIG = (typeof EDUMANAGER_CONFIG !== 'undefined') ? EDUMANAGER_CONFIG : {
  SESSION_TIMEOUT_MS:   30 * 60 * 1000,
  RATE_LIMIT_MAX:       5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_BACKOFF:   true,
  CSRF_TOKEN_LENGTH:    32,
};

/* -----------------------------------------------------------------------
   1. PROTECTION XSS – Echappement HTML
   Utiliser TOUJOURS cette fonction avant d'injecter
   des donnees utilisateur dans le DOM via innerHTML.
   ----------------------------------------------------------------------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Cree un element DOM texte securise (alternative a innerHTML)
 * Utiliser cette methode plutot que innerHTML quand possible.
 */
function createSafeTextNode(text) {
  return document.createTextNode(String(text || ''));
}

/* -----------------------------------------------------------------------
   2. RATE LIMITING – Anti brute-force avec backoff exponentiel
   Max 5 tentatives par fenetre de 15 minutes.
   Delai exponentiel : 1s, 2s, 4s, 8s, 16s entre les tentatives.
   ----------------------------------------------------------------------- */
const RATE_LIMIT = {
  MAX_ATTEMPTS:    _SEC_CONFIG.RATE_LIMIT_MAX,
  WINDOW_MS:       _SEC_CONFIG.RATE_LIMIT_WINDOW_MS,
  STORAGE_KEY:     'edu_rl_login',
  BACKOFF_ENABLED: _SEC_CONFIG.RATE_LIMIT_BACKOFF,
};

function getRateLimitData() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT.STORAGE_KEY);
    if (!raw) return { attempts: 0, firstAttempt: 0, lastAttempt: 0 };
    const data = JSON.parse(raw);
    // Validation de structure pour eviter les injections via localStorage
    if (typeof data.attempts !== 'number' || typeof data.firstAttempt !== 'number') {
      localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
      return { attempts: 0, firstAttempt: 0, lastAttempt: 0 };
    }
    return data;
  } catch {
    localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
    return { attempts: 0, firstAttempt: 0, lastAttempt: 0 };
  }
}

function isRateLimited() {
  const data = getRateLimitData();
  const now  = Date.now();
  // Reinitialiser si la fenetre est expiree
  if (now - data.firstAttempt > RATE_LIMIT.WINDOW_MS) {
    localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
    return false;
  }
  // Verifier le nombre de tentatives
  if (data.attempts >= RATE_LIMIT.MAX_ATTEMPTS) return true;
  // Verifier le backoff exponentiel
  if (RATE_LIMIT.BACKOFF_ENABLED && data.lastAttempt) {
    const backoffMs = Math.min(1000 * Math.pow(2, data.attempts - 1), 30000); // Max 30s
    if (now - data.lastAttempt < backoffMs) return true;
  }
  return false;
}

function recordFailedAttempt() {
  const data = getRateLimitData();
  const now  = Date.now();
  if (now - data.firstAttempt > RATE_LIMIT.WINDOW_MS) {
    localStorage.setItem(RATE_LIMIT.STORAGE_KEY, JSON.stringify({
      attempts: 1, firstAttempt: now, lastAttempt: now
    }));
  } else {
    data.attempts++;
    data.lastAttempt = now;
    localStorage.setItem(RATE_LIMIT.STORAGE_KEY, JSON.stringify(data));
  }
  // Log l'evenement
  logSecurityEvent('RATE_LIMIT_ATTEMPT', { attempts: data.attempts + 1 });
}

function resetRateLimit() {
  localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
}

function getRateLimitMessage() {
  const data = getRateLimitData();
  if (RATE_LIMIT.BACKOFF_ENABLED && data.attempts < RATE_LIMIT.MAX_ATTEMPTS) {
    const backoffSec = Math.min(Math.pow(2, data.attempts - 1), 30);
    return `Veuillez patienter ${backoffSec} seconde(s) avant de reessayer.`;
  }
  const remaining = Math.ceil((RATE_LIMIT.WINDOW_MS - (Date.now() - data.firstAttempt)) / 60000);
  return `Trop de tentatives. Reessayez dans ${remaining} minute(s).`;
}

/* -----------------------------------------------------------------------
   3. VALIDATION & SANITISATION DES INPUTS
   ----------------------------------------------------------------------- */

/** Valide un email (OWASP A03 – Injection prevention) */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 320) return false; // RFC 5321 max
  return /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(trimmed);
}

/** Valide la complexite du mot de passe :
 *  - Min 8 caracteres, max 128
 *  - Au moins une majuscule, une minuscule, un chiffre */
function isStrongPassword(pwd) {
  if (!pwd || typeof pwd !== 'string') return false;
  if (pwd.length < _SEC_CONFIG.PASSWORD_MIN_LENGTH || pwd.length > (_SEC_CONFIG.PASSWORD_MAX_LENGTH || 128)) return false;
  return /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
}

/** Sanitise une chaine (supprime balises HTML) – OWASP A03 */
function sanitizeInput(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim()
    .replace(/<[^>]*>/g, '')          // Supprime les balises HTML
    .replace(/javascript:/gi, '')      // Supprime les URI javascript:
    .replace(/on\w+\s*=/gi, '')        // Supprime les handlers d'evenements
    .replace(/data:\s*text\/html/gi, ''); // Supprime les URI data:text/html
}

/** Valide et sanitise une URL (OWASP A10 – SSRF prevention) */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Bloquer les protocoles dangereux
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.includes(parsed.protocol)) return false;
    // Bloquer les IP internes (SSRF)
    const hostname = parsed.hostname;
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname === '::1' ||
        hostname === '[::1]') {
      return false;
    }
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Sanitise un objet (nettoie toutes les valeurs string recursivement) */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return sanitizeInput(String(obj));
  const clean = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeInput(key);
    if (typeof value === 'string') {
      clean[cleanKey] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      clean[cleanKey] = sanitizeObject(value);
    } else {
      clean[cleanKey] = value;
    }
  }
  return clean;
}

/* -----------------------------------------------------------------------
   4. JOURNALISATION DE SECURITE (Audit Log)
   Enregistre les evenements de securite dans Supabase si disponible.
   OWASP A09:2021 – Security Logging and Monitoring Failures
   ----------------------------------------------------------------------- */
async function logSecurityEvent(eventType, metadata) {
  // Enregistrement local en dev uniquement
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.info(`[AUDIT] ${eventType}`, metadata);
  }

  // Enregistrement Supabase si client disponible
  if (window.SupabaseEdu && window.SupabaseEdu.client) {
    try {
      const { data: { user } } = await window.SupabaseEdu.client.auth.getUser();
      await window.SupabaseEdu.client.from('audit_logs').insert({
        user_id:    user?.id || null,
        event_type: String(eventType).substring(0, 100),
        user_agent: navigator.userAgent.substring(0, 255),
        metadata:   sanitizeObject(metadata || {}),
      });
    } catch (err) {
      // Echec silencieux : ne pas bloquer l'UX pour un log
      if (window.location.hostname === 'localhost') {
        console.warn('[AUDIT] Echec enregistrement:', err.message);
      }
    }
  }
}

/* -----------------------------------------------------------------------
   5. PROTECTION CSRF – Token de session
   Genere et verifie un token CSRF stocke en sessionStorage.
   OWASP A01:2021 – Broken Access Control
   ----------------------------------------------------------------------- */
function generateCsrfToken() {
  const length = _SEC_CONFIG.CSRF_TOKEN_LENGTH || 32;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('edu_csrf', token);
  return token;
}

function getCsrfToken() {
  let token = sessionStorage.getItem('edu_csrf');
  if (!token) token = generateCsrfToken();
  return token;
}

/** Verifie un token CSRF (a appeler lors des soumissions de formulaire) */
function verifyCsrfToken(token) {
  const storedToken = sessionStorage.getItem('edu_csrf');
  if (!storedToken || !token) return false;
  // Comparaison a temps constant pour prevenir les attaques de timing
  if (storedToken.length !== token.length) return false;
  let result = 0;
  for (let i = 0; i < storedToken.length; i++) {
    result |= storedToken.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}

/* -----------------------------------------------------------------------
   6. DETECTION DES PAGES PRIVEES – Bloquer l'indexation
   OWASP A05:2021 – Security Misconfiguration
   ----------------------------------------------------------------------- */
(function enforcePrivatePage() {
  if (window.location.pathname.includes('/dashboard/')) {
    // S'assurer que la meta noindex est presente
    if (!document.querySelector('meta[name="robots"]')) {
      const meta = document.createElement('meta');
      meta.name    = 'robots';
      meta.content = 'noindex, nofollow, noarchive';
      document.head.appendChild(meta);
    }
    // Ajouter X-Robots-Tag via meta http-equiv (backup)
    if (!document.querySelector('meta[http-equiv="X-Robots-Tag"]')) {
      const metaHttp = document.createElement('meta');
      metaHttp.httpEquiv = 'X-Robots-Tag';
      metaHttp.content   = 'noindex';
      document.head.appendChild(metaHttp);
    }
  }
})();

/* -----------------------------------------------------------------------
   7. EN-TETES DE SECURITE (CSP, X-Content-Type-Options, Referrer-Policy)
   Appliques via meta tags comme filet de securite.
   Les vrais en-tetes HTTP sont configures dans vercel.json/_headers.
   OWASP A05:2021 – Security Misconfiguration
   ----------------------------------------------------------------------- */
(function enforceSecurityHeaders() {
  // Content Security Policy (meta tag)
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    document.head.insertBefore(csp, document.head.firstChild);
  }

  // X-Content-Type-Options
  if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
    const xcto = document.createElement('meta');
    xcto.httpEquiv = 'X-Content-Type-Options';
    xcto.content   = 'nosniff';
    document.head.appendChild(xcto);
  }

  // Referrer-Policy
  if (!document.querySelector('meta[name="referrer"]')) {
    const ref = document.createElement('meta');
    ref.name    = 'referrer';
    ref.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(ref);
  }
})();

/* -----------------------------------------------------------------------
   8. SESSION INTEGRITY – Anti-tampering
   Detecte les modifications malveillantes de la session localStorage.
   OWASP A08:2021 – Software and Data Integrity Failures
   ----------------------------------------------------------------------- */
function generateSessionFingerprint(session) {
  if (!session) return '';
  // Hash leger base sur les donnees de session + user agent
  const raw = JSON.stringify({
    userId: session.userId,
    email:  session.email,
    ua:     navigator.userAgent
  });
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convertir en entier 32 bits
  }
  return Math.abs(hash).toString(36);
}

function saveSecureSession(session) {
  if (!session) return;
  session._fp = generateSessionFingerprint(session);
  localStorage.setItem('edu_session', JSON.stringify(session));
}

function verifySessionIntegrity() {
  try {
    const raw = localStorage.getItem('edu_session');
    if (!raw) return true; // Pas de session = OK
    const session = JSON.parse(raw);
    if (!session || !session._fp) return false;
    const expected = generateSessionFingerprint(session);
    return session._fp === expected;
  } catch {
    return false;
  }
}

/* -----------------------------------------------------------------------
   9. NETTOYAGE DES DONNEES SENSIBLES – Expiration de session
   Efface les donnees sensibles du localStorage apres inactivite.
   ----------------------------------------------------------------------- */
(function sessionExpiryWatcher() {
  const SESSION_TIMEOUT_MS = _SEC_CONFIG.SESSION_TIMEOUT_MS;
  const LAST_ACTIVE_KEY    = 'edu_last_active';

  function updateActivity() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }

  function checkExpiry() {
    const last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
    if (last && Date.now() - last > SESSION_TIMEOUT_MS) {
      // Session expiree : nettoyer les donnees sensibles
      localStorage.removeItem('edu_session');
      localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
      if (window.SupabaseEdu) {
        window.SupabaseEdu.client?.auth.signOut().catch(() => {});
      }
      logSecurityEvent('SESSION_EXPIRED', {});
      if (window.location.pathname.includes('/dashboard/')) {
        window.location.href = '../signin.html?reason=timeout';
      }
    }
  }

  // Verifier l'integrite de la session au demarrage
  if (!verifySessionIntegrity()) {
    localStorage.removeItem('edu_session');
    logSecurityEvent('SESSION_TAMPER_DETECTED', {});
    if (window.location.pathname.includes('/dashboard/')) {
      window.location.href = '../signin.html?reason=security';
    }
  }

  // Surveiller l'activite utilisateur
  ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, updateActivity, { passive: true })
  );

  updateActivity();
  checkExpiry();
  // Verifier toutes les minutes
  setInterval(checkExpiry, 60 * 1000);
})();

/* -----------------------------------------------------------------------
   10. PROTECTION CONTRE LE CLICKJACKING
   OWASP A05:2021 – Si la page est dans un iframe, la rediriger.
   ----------------------------------------------------------------------- */
(function preventClickjacking() {
  if (window.self !== window.top) {
    // La page est dans un iframe — tentative de clickjacking
    logSecurityEvent('CLICKJACKING_ATTEMPT', { referrer: document.referrer });
    try {
      window.top.location = window.self.location;
    } catch {
      // Cross-origin : cacher le contenu
      document.body.style.display = 'none';
    }
  }
})();

/* -----------------------------------------------------------------------
   11. EXPORT GLOBAL
   ----------------------------------------------------------------------- */
window.EduSecurity = {
  // XSS
  escapeHtml,
  createSafeTextNode,
  // Rate limiting
  isRateLimited,
  recordFailedAttempt,
  resetRateLimit,
  getRateLimitMessage,
  // Validation
  isValidEmail,
  isStrongPassword,
  sanitizeInput,
  sanitizeObject,
  isValidUrl,
  // Audit
  logSecurityEvent,
  // CSRF
  generateCsrfToken,
  getCsrfToken,
  verifyCsrfToken,
  // Session integrity
  saveSecureSession,
  verifySessionIntegrity,
  generateSessionFingerprint,
};
