const { Jimp } = require('jimp');

/**
 * Convertisseur RGB vers HSV.
 * Essentiel pour s'abstraire des variations de luminosité.
 */
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, v * 100]; // Normalisation 360°, 100%, 100%
}

/**
 * Calcule la gravité en analysant la santé chromatique et la structure de la feuille.
 */
exports.calculateGravityFromBuffer = async (imageBuffer, hasDisease, hasPest) => {
    try {
        const image = await Jimp.read(imageBuffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        let totalPixels = width * height;
        let plantPixels = 0;    // Pixels appartenant à la plante (Vert + Jaune/Brun)
        let healthyPixels = 0;  // Pixels bien verts
        let lesionPixels = 0;   // Pixels jaunes, bruns ou nécrosés

        image.scan(0, 0, width, height, function(x, y, idx) {
            const r = this.bitmap.data[idx];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            const [h, s, v] = rgbToHsv(r, g, b);

            // 1. Détection du fond (trop sombre ou trop clair/neutre)
            const isNeutral = s < 15; // Trop gris/blanc/noir
            const isDark = v < 15;    // Trop sombre (ombre portée)
            
            if (isNeutral || isDark) return; 

            // 2. Si on est ici, on considère que c'est de la "matière végétale"
            plantPixels++;

            // 3. Classification chromatique
            // Vert : Teinte entre 60° et 160° environ
            if (h >= 65 && h <= 170 && s > 20) {
                healthyPixels++;
            } 
            // Lésions (Jaune, Orange, Brun, Rougeâtre) : Teinte entre 10° et 60°
            else if (h >= 5 && h <= 60 && v > 20) {
                lesionPixels++;
            }
            // Nécroses très sombres (pour les maladies avancées)
            else if (v < 30 && s > 10) {
                lesionPixels++;
            }
        });

        if (plantPixels === 0) return 0;

        let gravityScore = 0;

        if (hasPest) {
            /**
             * LOGIQUE NUISIBLES (Trous)
             * On estime la perte de surface. Dans un smart-crop de feuille, 
             * la plante devrait occuper environ 70-80% de l'image.
             * Si elle en occupe moins, c'est qu'il y a des "vides" (trous).
             */
            const expectedPlantRatio = 0.75; 
            const actualPlantRatio = plantPixels / totalPixels;
            
            // Si la plante occupe moins d'espace que prévu, on considère la différence comme des trous
            const holeEstimation = Math.max(0, expectedPlantRatio - actualPlantRatio) * 100;
            
            // Gravité = (Surface lésée / Surface présente) + Estimation des trous
            const surfaceGravity = (lesionPixels / plantPixels) * 100;
            gravityScore = surfaceGravity + (holeEstimation * 1.5); // On pondère les trous car ils sont structurels
        } 
        else if (hasDisease) {
            /**
             * LOGIQUE MALADIES (Taches)
             * Ratio direct des pixels malades sur la surface totale de la plante.
             */
            gravityScore = (lesionPixels / plantPixels) * 100;
        }

        // Finalisation : Plafond à 100% et arrondi
        const finalScore = Math.min(100, Math.round(gravityScore * 100) / 100);
        
        console.log(`📊 [Gravity Analysis] Plant Area: ${plantPixels}px | Lesions: ${lesionPixels}px | Score: ${finalScore}%`);
        
        return finalScore;

    } catch (error) {
        console.error("❌ Erreur calcul de gravité :", error);
        return 10.0; // Score de repli
    }
};