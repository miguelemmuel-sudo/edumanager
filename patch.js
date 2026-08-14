const fs = require('fs');
let app = fs.readFileSync('js/app.js', 'utf8');

// 1. Fix the dashboard route check
app = app.replace(
    /else if \\(path\\.includes\\('dashboard\\/index\\.html'\\) \\|\\| path\\.endsWith\\('dashboard\\/'\\)\\) \\{/,
    \"else if (path.includes('dashboard/index.html') || path.endsWith('dashboard/') || path.endsWith('dashboard')) {\"
);

// 2. Inject supabase.from override
const overrideCode = \
    // Override supabase.from to automatically filter by etablissement_id
    if (window.supabase && !window.supabase._isOverridden) {
        const originalFrom = window.supabase.from.bind(window.supabase);
        window.supabase.from = function(table) {
            let query = originalFrom(table);
            const tablesWithEtab = ['eleves', 'enseignants', 'classes', 'paiements', 'messages', 'frais_scolaires'];
            if (tablesWithEtab.includes(table)) {
                const sessionStr = localStorage.getItem('edu_session');
                if (sessionStr) {
                    try {
                        const session = JSON.parse(sessionStr);
                        if (session.etablissement_id) {
                            query = query.eq('etablissement_id', session.etablissement_id);
                        }
                    } catch(e) {}
                }
            }
            return query;
        };
        window.supabase._isOverridden = true;
    }
\;

app = app.replace(
    'if (!window.supabase) {',
    overrideCode + '\\n    if (!window.supabase) {'
);

fs.writeFileSync('js/app.js', app);
console.log('Patched app.js successfully');
