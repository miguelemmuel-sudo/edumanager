# 🔐 EduManager - Guide de Sécurité (OWASP Top 10)

Ce document décrit les règles de sécurité strictes appliquées à l'application EduManager. **Toute modification du code doit respecter ces directives.**

> [!CAUTION]
> **Règle d'or** : Ne JAMAIS accepter de modification qui réduirait le niveau de sécurité actuel de l'application. La sécurité passe avant la commodité de développement.

## Architecture de Sécurité

L'application repose sur un frontend statique (HTML/JS) hébergé sur Vercel/Netlify, et un backend Serverless (Supabase).
- **Le frontend est public** : Les clés API présentes dans le frontend (`anon key`) sont publiques par design.
- **La protection est côté serveur (Supabase)** : La véritable sécurité est assurée par le Row Level Security (RLS) sur Supabase.

---

## Directives pour les Développeurs

### 1. Variables d'Environnement et Secrets (OWASP A02:2021)
- La `service_role` key de Supabase **NE DOIT JAMAIS** être utilisée côté client.
- Les mots de passe, tokens et clés secrètes ne doivent **jamais** être écrits en dur dans le code.
- La clé `anon` publique est stockée dans `js/config.js` pour faciliter sa rotation, mais elle n'est pas un secret.

### 2. Base de Données et RLS (OWASP A01:2021)
- **Toute nouvelle table Supabase DOIT avoir RLS d'activé immédiatement**.
- Les politiques RLS (`policies`) doivent être testées (INSERT, SELECT, UPDATE, DELETE).
- L'utilisation de la fonction `is_admin()` est obligatoire pour protéger les données sensibles.

### 3. Prévention XSS (OWASP A03:2021)
- **Règle absolue** : Toute donnée utilisateur injectée via `innerHTML` doit être échappée.
- Utilisez la fonction `EduSecurity.escapeHtml()` (ou l'alias `_e()`) dans `dashboard.js`.
- Privilégiez `textContent` ou `createSafeTextNode()` lorsque c'est possible.

### 4. Authentification et Sessions (OWASP A07:2021)
- L'intégrité de la session est vérifiée via `EduSecurity.verifySessionIntegrity()`.
- Un système de rate limiting (avec backoff exponentiel) est actif côté client en plus des protections Supabase.
- Ne pas contourner ces vérifications pour des tests locaux.

### 5. Journalisation d'Audit (OWASP A09:2021)
- Toute action sensible (connexion, création de cours, ajout de note, tentative échouée) doit être journalisée.
- Utilisez `EduSecurity.logSecurityEvent('NOM_EVENEMENT', metadata)`.

### 6. SSRF et Validations (OWASP A10:2021)
- Ne faites jamais confiance aux inputs utilisateurs.
- Toute URL traitée côté client doit être validée via `EduSecurity.isValidUrl()` pour bloquer les URI dangereuses (`javascript:`, `data:`, IPs internes).

## Déploiement
- Le fichier `vercel.json` et le fichier `_headers` assurent que les en-têtes HTTP de sécurité (CSP, HSTS, X-Frame-Options) sont envoyés par le serveur web.
- Ne modifiez pas la Content Security Policy (CSP) sans vérifier l'impact.
