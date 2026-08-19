const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ouraqvirmashzzstkqfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCategories() {
    console.log("Fetching matieres...");
    const { data: matieres, error } = await supabase.from('matieres').select('id, nom, categorie');
    
    if (error) {
        console.error("Error fetching matieres:", error);
        return;
    }
    
    let updatedCount = 0;
    
    for (let matiere of matieres) {
        let newCategory = matiere.categorie;
        const nomNormalise = matiere.nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if (nomNormalise.includes('math') || nomNormalise.includes('physique') || nomNormalise.includes('chimie') || nomNormalise.includes('svt') || nomNormalise.includes('biologie') || nomNormalise.includes('informatique') || nomNormalise.includes('tic')) {
            newCategory = 'Enseignement Scientifique';
        } else if (nomNormalise.includes('francais') || nomNormalise.includes('anglais') || nomNormalise.includes('philosophie') || nomNormalise.includes('espagnol') || nomNormalise.includes('allemand') || nomNormalise.includes('litterature')) {
            newCategory = 'Enseignement Littéraire';
        } else if (nomNormalise.includes('histoire') || nomNormalise.includes('geographie') || nomNormalise.includes('ecm') || nomNormalise.includes('education civique')) {
            newCategory = 'Sciences Humaines';
        }
        
        if (newCategory !== matiere.categorie) {
            console.log(`Updating ${matiere.nom} from '${matiere.categorie}' to '${newCategory}'`);
            const { error: updateError } = await supabase.from('matieres').update({ categorie: newCategory }).eq('id', matiere.id);
            if (updateError) {
                console.error("Error updating", matiere.nom, updateError);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`Successfully updated ${updatedCount} matieres.`);
}

fixCategories();
