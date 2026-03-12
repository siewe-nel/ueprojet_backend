// ============================================================================
// FICHIER     : user.controller.js
// EMPLACEMENT : src/controllers/user.controller.js
// RÔLE        : Gère l'inscription, la connexion et les profils utilisateurs
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co', 
    process.env.SUPABASE_KEY || 'placeholder_key'
);

exports.register = async (req, res) => {
    // NOTE: On ne demande plus "farmName" ici, le nom du champ se crée via l'API "fields"
    const { email, password, fullName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "L'email et le mot de passe sont obligatoires." });
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        if (authData.user) {
            const { error: profileError } = await supabase.from('user_profiles').insert([{
                id: authData.user.id, 
                email: email,
                full_name: fullName
            }]);

            if (profileError) throw profileError;
        }

        res.status(201).json({ 
            success: true, 
            message: "Compte créé avec succès !",
            userId: authData.user.id
        });

    } catch (error) {
        res.status(500).json({ error: error.message || "Erreur lors de l'inscription." });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).single();

        res.json({
            success: true,
            session: data.session,
            user: profile
        });
    } catch (error) {
        res.status(401).json({ error: "Identifiants incorrects." });
    }
};

exports.getProfile = async (req, res) => {
    const { userId } = req.params;
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        res.json({ success: true, profile: data });
    } catch (error) {
        res.status(404).json({ error: "Profil introuvable." });
    }
};