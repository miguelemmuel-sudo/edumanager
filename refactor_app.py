import re

filepath = "c:\\Users\\HP\\Downloads\\edumanager-main\\js\\app.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Dashboard Recent Eleves (line ~361)
content = content.replace(
    "let queryRecent = window.supabase.from('eleves').select('id, prenom, nom, created_at, statut, classes(nom)').order('created_at', { ascending: false }).limit(5);",
    "let queryRecent = window.supabase.from('inscriptions_annuelles').select('id, statut, eleves(prenom, nom, created_at), classes(nom)').eq('annee_academique_id', window.currentAcademicYearId).order('created_at', { ascending: false }).limit(5);"
)

# 2. fetchAndRenderClasses (line ~1084)
content = content.replace(
    "let query = window.supabase.from('classes').select('*, enseignants(nom, prenom), eleves(count)');",
    "let query = window.supabase.from('classes').select('*, enseignants(nom, prenom), inscriptions_annuelles(count)').eq('annee_academique_id', window.currentAcademicYearId);"
)

# 3. fetchAndRenderPaiements (line ~1560)
content = content.replace(
    "window.supabase.from('paiements').select('*, eleves(nom, prenom, matricule, classes(nom))').order('created_at', { ascending: false })",
    "window.supabase.from('paiements').select('*, eleves(nom, prenom, matricule, classes(nom))').eq('annee_academique_id', window.currentAcademicYearId).order('created_at', { ascending: false })"
)

# 4. updateCalculations in Paiements (line ~1796)
content = content.replace(
    "const { data: eleve } = await window.supabase.from('eleves').select('classe_id').eq('id', eleve_id).single();",
    "const { data: eleve } = await window.supabase.from('inscriptions_annuelles').select('classe_id').eq('eleve_id', eleve_id).eq('annee_academique_id', window.currentAcademicYearId).single();"
)

# 5. btnSavePaiement (line ~1905)
content = content.replace(
    "await window.supabase.from('eleves').update({ statut_financier: finalStatut }).eq('id', data.eleve_id);",
    "await window.supabase.from('inscriptions_annuelles').update({ statut_paiement: finalStatut }).eq('eleve_id', data.eleve_id).eq('annee_academique_id', window.currentAcademicYearId);"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("app.js updated successfully via python script.")
