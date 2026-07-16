/* =======================================================================
   EduManager – Configuration Publique
   
   OWASP A02:2021 – Cryptographic Failures
   -----------------------------------------
   Ce fichier contient UNIQUEMENT les cles PUBLIQUES (anon key).
   La cle anon Supabase est concue pour etre exposee cote client.
   Elle est protegee par les Row Level Security (RLS) policies.
   
   ⚠️  NE JAMAIS PLACER ICI :
       - service_role key
       - Mots de passe
       - Tokens d'API prives
       - Secrets de chiffrement
   
   Pour un deploiement en production avec Next.js/Vercel, utilisez :
       NEXT_PUBLIC_SUPABASE_URL (variable d'environnement)
       NEXT_PUBLIC_SUPABASE_ANON_KEY (variable d'environnement)
   ======================================================================= */

'use strict';

const EDUMANAGER_CONFIG = Object.freeze({
  /* ---- Supabase (cles publiques uniquement) ---- */
  SUPABASE_URL:      'https://ouraqvirmashzzstkqfx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo',

  /* ---- Securite ---- */
  SESSION_TIMEOUT_MS:    30 * 60 * 1000,   // 30 minutes d'inactivite
  RATE_LIMIT_MAX:        5,                 // Max tentatives par fenetre
  RATE_LIMIT_WINDOW_MS:  15 * 60 * 1000,   // Fenetre de 15 minutes
  RATE_LIMIT_BACKOFF:    true,              // Delai exponentiel active
  CSRF_TOKEN_LENGTH:     32,                // Longueur du token CSRF en octets
  PASSWORD_MIN_LENGTH:   8,
  PASSWORD_MAX_LENGTH:   128,

  /* ---- Application ---- */
  APP_NAME:    'EduManager',
  APP_VERSION: '2.0.0',

  /* ---- Roles autorises ---- */
  ROLES: Object.freeze({
    ADMIN:   'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
  }),

  /* ---- Pages restreintes par role ---- */
  ADMIN_ONLY_PAGES: Object.freeze(['utilisateurs', 'parametres']),
});

// Empêcher toute modification
if (typeof window !== 'undefined') {
  window.EDUMANAGER_CONFIG = EDUMANAGER_CONFIG;
}
