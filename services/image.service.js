const smartcrop = require('smartcrop-sharp');
const { Jimp } = require('jimp');

exports.smartCropBuffer = async (imageBuffer) => {
    try {
        console.log("🔍 Analyse intelligente de l'image en mémoire...");

        // 1. Analyse de saillance
        const result = await smartcrop.crop(imageBuffer, { 
            width: 250, 
            height: 250 
        });

        if (result && result.topCrop) {
            const c = result.topCrop;
            console.log(`✅ Sujet localisé à [${Math.round(c.x)}, ${Math.round(c.y)}]`);

            // 2. Charger l'image avec Jimp
            const image = await Jimp.read(imageBuffer);
            
            // 3. Appliquer le recadrage (Syntaxe compatible Jimp v1+)
            // Note: On utilise un objet avec x, y, w, h
            image.crop({ 
                x: Math.round(c.x), 
                y: Math.round(c.y), 
                w: Math.round(c.width), 
                h: Math.round(c.height) 
            });

            // 4. Exporter en buffer JPEG
            const croppedBuffer = await image.getBuffer('image/jpeg');
            
            console.log(`💾 Recadrage terminé avec succès en RAM.`);
            return croppedBuffer;
        } else {
            return imageBuffer;
        }

    } catch (err) {
        console.error("❌ Erreur lors du smart cropping :", err);
        return imageBuffer; // On continue avec l'original en cas d'erreur
    }
};