const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co', 
    process.env.SUPABASE_KEY || 'placeholder_key'
);

exports.createField = async (req, res) => {
    const { userId, name, description } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ error: "L'ID de l'utilisateur et le nom du champ sont obligatoires." });
    }

    try {
        const { data, error } = await supabase
            .from('fields')
            .insert([{
                user_id: userId,
                name: name,
                description: description || ''
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: "Champ créé avec succès.", field: data });
    } catch (error) {
        console.error("Erreur création champ:", error);
        res.status(500).json({ error: "Erreur lors de la création du champ." });
    }
};

exports.getUserFields = async (req, res) => {
    const { userId } = req.params;

    try {
        const { data, error } = await supabase
            .from('fields')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, fields: data });
    } catch (error) {
        console.error("Erreur récupération champs:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des champs." });
    }
};