const ort = require('onnxruntime-node');
const { Jimp } = require('jimp');

/**
 * LABELS ÉTABLIS STRICTEMENT SELON TES FICHIERS TXT
 */
const DISEASE_BY_SPECIES = {
    'Maïs': [
        'Abiotic_disease-D', 'Blight', 'Common_Rust', 'Curvularia-D', 
        'Gray_Leaf_Spot', 'Healthy', 'Helminthosporiosis-D', 'MaizeLeafDataset', 
        'Rust-D', 'Spodotera_frugiperda- A', 'Stripe-D', 'Virosis-D', 
        'fall army worm', 'herbicide burn', 'magnesium deficiency', 
        'maize streak', 'multiple', 'nitrogen deficiency', 
        'potassium deficiency', 'stalk borer', 'sulphur deficiency', 'zinc deficiency'
    ],
    'Tomate': [
        'Bacterial_floundering_d', 'Blossom_end_rot_d', 'Early_blight', 'Mite_d', 
        'Septoria_leaf_spot', 'Tomato_Bacterial_spot', 'Tomato_Late_blight', 
        'Tomato_Leaf_Mold', 'Tomato_Spider_mites_Two_spotted_spider_mite', 
        'Tomato__Target_Spot', 'Tomato__Tomato_mosaic_virus', 'YellowLeaf__Curl_Virus', 
        'alternaria_d', 'alternaria_mite_d', 'exces_nitrogen_d', 'fusarium_d', 
        'healthy', 'late_blight_d', 'sunburn_d', 'virosis_d'
    ]
};

const PEST_BY_SPECIES = {
    'Maïs': [
        'Aphids-P', 'Maize leaf beetle', 'Spodoptera_frugiperda-P', 
        'maize fall armyworm', 'maize stem borer'
    ],
    'Tomate': [
        'helicoverpa_armigera_p', 'tuta_absoluta_p'
    ]
};

const SPECIES_LABELS = ['Maïs', 'Tomate'];
const ALL_DISEASES = [...DISEASE_BY_SPECIES['Maïs'], ...DISEASE_BY_SPECIES['Tomate']].sort();
const ALL_PESTS = [...PEST_BY_SPECIES['Maïs'], ...PEST_BY_SPECIES['Tomate']].sort();

let session = null;

function softmax(logits) {
    const maxLogit = Math.max(...logits);
    const scores = logits.map(l => Math.exp(l - maxLogit));
    const sum = scores.reduce((a, b) => a + b);
    return scores.map(s => s / sum);
}

exports.predictFromBuffer = async (imageBuffer) => {
    try {
        if (!session) {
            session = await ort.InferenceSession.create(process.env.MODEL_PATH || './ml_models/best_plant_model.onnx');
        }

        const image = await Jimp.read(imageBuffer);
        image.resize({ w: 224, h: 224 });
        const float32Data = new Float32Array(3 * 224 * 224);
        const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];

        image.scan(0, 0, 224, 224, function(x, y, idx) {
            float32Data[x + y * 224] = (this.bitmap.data[idx]/255 - mean[0]) / std[0];
            float32Data[x + y * 224 + 224*224] = (this.bitmap.data[idx+1]/255 - mean[1]) / std[1];
            float32Data[x + y * 224 + 2*224*224] = (this.bitmap.data[idx+2]/255 - mean[2]) / std[2];
        });

        const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', float32Data, [1, 3, 224, 224]) });

        const probSpecies = softmax(Array.from(outputs[session.outputNames[0]].data));
        const probDisease = softmax(Array.from(outputs[session.outputNames[1]].data));
        const probPest    = softmax(Array.from(outputs[session.outputNames[2]].data));

        const maxSpec = Math.max(...probSpecies);
        // Si l'espèce est incertaine, on renvoie RAS pour tout
        const species = maxSpec >= 0.80 ? SPECIES_LABELS[probSpecies.indexOf(maxSpec)] : 'Inconnu';

        const getFilteredResult = (probs, allLabels, speciesMap, currentSpecies) => {
            if (currentSpecies === 'Inconnu') return { label: 'RAS', score: 0 };
            
            const allowedLabels = speciesMap[currentSpecies] || [];
            let bestScore = -1;
            let bestLabel = "Sain";

            allLabels.forEach((label, index) => {
                if (allowedLabels.includes(label)) {
                    if (probs[index] > bestScore) {
                        bestScore = probs[index];
                        bestLabel = label;
                    }
                }
            });

            // LOGIQUE RAS : Si le score est faible ou si c'est un label "Healthy"
            const isHealthyLabel = bestLabel.toLowerCase().includes('healthy') || bestLabel === 'Sain';
            if (bestScore < 0.80 || isHealthyLabel) {
                return { label: 'RAS', score: bestScore };
            }

            return { label: bestLabel, score: bestScore };
        };

        return {
            species: { label: species, score: maxSpec },
            disease: getFilteredResult(probDisease, ALL_DISEASES, DISEASE_BY_SPECIES, species),
            pest: getFilteredResult(probPest, ALL_PESTS, PEST_BY_SPECIES, species)
        };

    } catch (error) {
        console.error("❌ Erreur Inférence :", error);
        throw error;
    }
};