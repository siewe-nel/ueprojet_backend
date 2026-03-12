const cloudinary = require('cloudinary').v2;

// Configuration avec tes identifiants validés
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dubn7vy1i',
  api_key: process.env.CLOUDINARY_API_KEY || '261216888581652',
  api_secret: process.env.CLOUDINARY_API_SECRET || '9GAlO5QX1H5kAfuWtlJZEJmiB9Y'
});

/**
 * Upload un buffer via conversion Base64.
 * Cette méthode évite les erreurs de coupure de flux (ECONNRESET).
 * @param {Buffer} buffer - L'image recadrée en mémoire (RAM)
 */
exports.uploadImageFromBuffer = async (buffer) => {
    try {
        // 1. Conversion du Buffer binaire en chaîne de caractères Base64
        // On ajoute le préfixe data:image/jpeg pour que Cloudinary comprenne le format
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        // 2. Envoi du bloc de texte à Cloudinary
        // On utilise la méthode .upload qui est asynchrone et très stable
        const result = await cloudinary.uploader.upload(base64Image, {
            folder: 'plante_expert_diagnostics',
            resource_type: 'image',
            quality: 'auto'
        });

        console.log("☁️ Image sauvegardée avec succès :", result.secure_url);
        
        // On retourne l'URL sécurisée (https)
        return result.secure_url;

    } catch (error) {
        console.error("❌ Erreur Cloudinary (Méthode Bloc) :", error);
        throw new Error("Échec de l'envoi de l'image au Cloud.");
    }
};