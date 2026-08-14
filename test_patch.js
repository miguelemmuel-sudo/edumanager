const mockSupabase = {
    from: function(table) {
        return {
            select: function(cols) { return { _query: \select \ from \\, eq: function(k,v){ this._query += \ where \=\\; return this; } }; },
            insert: function(data) { return { _inserted: data }; }
        }
    }
};

const window = { supabase: mockSupabase };
const localStorage = { getItem: () => JSON.stringify({ etablissement_id: 999 }) };

// The patch code:
    if (window.supabase && !window.supabase._isOverridden) {
        const originalFrom = window.supabase.from.bind(window.supabase);
        window.supabase.from = function(table) {
            const builder = originalFrom(table);
            const tablesWithEtab = ['eleves', 'enseignants', 'classes', 'paiements', 'frais_scolaires', 'etablissements', 'notes', 'messages'];
            
            let etabId = null;
            try {
                const sessionStr = localStorage.getItem('edu_session');
                if (sessionStr) {
                    etabId = JSON.parse(sessionStr).etablissement_id;
                }
            } catch(e) {}
            
            if (tablesWithEtab.includes(table) && etabId) {
                const originalSelect = builder.select.bind(builder);
                builder.select = function(...args) {
                    let q = originalSelect(...args);
                    if (table !== 'etablissements') {
                        q = q.eq('etablissement_id', etabId);
                    }
                    return q;
                };
                
                const originalInsert = builder.insert.bind(builder);
                builder.insert = function(payload, ...args) {
                    if (table !== 'etablissements') {
                        if (Array.isArray(payload)) {
                            payload.forEach(item => {
                                if (item.etablissement_id === undefined) item.etablissement_id = etabId;
                            });
                        } else if (payload && typeof payload === 'object') {
                            if (payload.etablissement_id === undefined) payload.etablissement_id = etabId;
                        }
                    }
                    return originalInsert(payload, ...args);
                };
            }
            return builder;
        };
        window.supabase._isOverridden = true;
    }

console.log(window.supabase.from('eleves').select('*'));
console.log(window.supabase.from('eleves').insert([{name: 'test'}]));

