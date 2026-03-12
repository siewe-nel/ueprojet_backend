-- ============================================================================
-- FICHIER     : supabase_schema.sql
-- EMPLACEMENT : Racine du projet (À copier/coller dans le SQL Editor de Supabase)
-- RÔLE        : Structure de la base de données (Tables et Relations)
-- NOTE        : RLS (Row Level Security) est désactivé par défaut à la création.
--               L'ID utilisateur est maintenant lié directement à Supabase Auth.
-- ============================================================================

-- 0. Table des profils utilisateurs (Liée à l'authentification Supabase)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, -- Lien direct avec Auth
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Table : Les Champs (Appartiennent à un utilisateur)
CREATE TABLE fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR NOT NULL, -- ex: "Champ Tomate Nord"
    description TEXT,      -- ex: "Serre hydroponique"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des informations encyclopédiques
CREATE TABLE diseases_info (
    label VARCHAR PRIMARY KEY,
    scientific_name VARCHAR,
    common_name VARCHAR,
    treatment_steps TEXT[], 
    where_to_find TEXT,
    approved_centers JSONB 
);

-- 3. Table des processus de suivi (Appartiennent à un CHAMP)
CREATE TABLE plants_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE NOT NULL, -- RELIÉ AU CHAMP
    status VARCHAR DEFAULT 'en_cours',
    last_gravity FLOAT DEFAULT 0.0,
    next_checkup_date TIMESTAMP WITH TIME ZONE,
    missed_checkups_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Historique détaillé (Chaque analyse)
CREATE TABLE tracking_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id UUID REFERENCES plants_tracking(id) ON DELETE CASCADE,
    image_urls TEXT[] NOT NULL,
    avg_gravity FLOAT NOT NULL,
    detected_species VARCHAR,
    detected_disease VARCHAR,
    detected_pest VARCHAR,
    evolution_advice TEXT,
    is_realtime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);