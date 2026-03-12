// ============================================================================
// FICHIER     : tracking.controller.js
// EMPLACEMENT : src/controllers/tracking.controller.js
// MODIFICATION : 1. Synchronisation avec dbService.updateOrInsertTracking
//                2. Optimisation de la logique de santé (isHealthy)
//                3. Enrichissement de la réponse avec les détails encyclopédiques
// ============================================================================

const cloudinaryService = require('../services/cloudinary.service');
const mlService = require('../services/ml.service');
const gravityService = require('../services/gravity.service');
const dbService = require('../services/database.service');
const imageService = require('../services/image.service');

/**
 * Récupère l'élément le plus fréquent dans un tableau.
 * Utile pour synthétiser le diagnostic sur plusieurs images.
 */
const getMostFrequent = (arr) => arr.sort((a,b) => arr.filter(v => v===a).length - arr.filter(v => v===b).length).pop();

/**
 * Détermine si un label renvoyé par l'IA est considéré comme "sain".
 * Gère les variantes de casse et les termes courants (RAS, Sain, Healthy).
 */
const isHealthy = (label) => {
    if (!label) return true;
    const l = label.toLowerCase();
    return l === 'sain' || l === 'ras' || l === 'healthy' || l.includes('sain');
};

/**
 * Point d'entrée principal pour l'analyse d'image et la mise à jour du suivi.
 */
exports.analyzeAndTrack = async (req, res) => {
    const files = req.files; 
    const { fieldId, isRealTime, existingTrackingId } = req.body;

    // Validations de base
    if (!files || files.length === 0) {
        return res.status(400).json({ error: "Aucune image n'a été uploadée." });
    }
    if (!fieldId) {
        return res.status(400).json({ error: "L'ID du champ est obligatoire pour l'analyse." });
    }

    try {
        const uploadedUrls = [];
        const gravityScores = [];
        const speciesList = [];
        const diseaseList = [];
        const pestList = [];

        // Traitement séquentiel de chaque image
        for (const file of files) {
            // 1. Prétraitement intelligent (Smart Crop) et Upload Cloud
            const processedBuffer = await imageService.smartCropBuffer(file.buffer);
            const cloudUrl = await cloudinaryService.uploadImageFromBuffer(processedBuffer);
            uploadedUrls.push(cloudUrl);

            // 2. Analyse par Intelligence Artificielle
            const prediction = await mlService.predictFromBuffer(processedBuffer);
            speciesList.push(prediction.species.label);
            diseaseList.push(prediction.disease.label);
            pestList.push(prediction.pest.label);

            // 3. Calcul de la gravité visuelle (uniquement si maladie/nuisible détecté)
            const hasDisease = !isHealthy(prediction.disease.label);
            const hasPest = !isHealthy(prediction.pest.label);

            if (hasDisease || hasPest) {
                const score = await gravityService.calculateGravityFromBuffer(
                    processedBuffer, 
                    hasDisease,
                    hasPest
                );
                gravityScores.push(score);
            } else {
                // Économie de calcul : score 0 direct pour les plantes saines
                gravityScores.push(0);
            }
        }

        // Synthèse des diagnostics (Majorité l'emporte)
        const mainSpecies = getMostFrequent(speciesList);
        const mainDisease = getMostFrequent(diseaseList);
        const mainPest = getMostFrequent(pestList);

        // Moyenne de la gravité sur toutes les photos
        const avgGravity = gravityScores.length > 0 
            ? gravityScores.reduce((a, b) => a + b, 0) / gravityScores.length 
            : 0;

        // 4. Gestion de la persistance (Suivi et Historique)
        const trackingRecord = existingTrackingId ? await dbService.getTrackingInfo(existingTrackingId) : null;
        
        // Mise à jour ou Création du dossier de suivi
        const nextCheckupData = await dbService.updateOrInsertTracking(
            existingTrackingId,
            fieldId,
            avgGravity,
            isRealTime === 'true'
        );

        const trackingId = nextCheckupData.trackingId;

        // Calcul de l'évolution par rapport au dernier contrôle
        let advice = "Premier diagnostic enregistré.";
        if (trackingRecord) {
            const diff = avgGravity - trackingRecord.last_gravity;
            if (diff > 5) advice = "⚠️ Détérioration détectée : l'infection progresse.";
            else if (diff < -5) advice = "✅ Amélioration constatée : la plante récupère.";
            else advice = "État stationnaire.";
        }

        // Sauvegarde dans l'historique temporel
        await dbService.saveHistory({
            trackingId,
            imageUrls: uploadedUrls,
            avgGravity,
            species: mainSpecies,
            disease: mainDisease,
            pest: mainPest,
            evolutionAdvice: advice,
            isRealTime: isRealTime === 'true'
        });

        // 5. Enrichissement des données pour le client (Détails et Recommandations)
        const diseaseDetails = await dbService.getLabelDetails(mainDisease);
        const pestDetails = await dbService.getLabelDetails(mainPest);
        const recommendations = await dbService.getRecommendations(mainDisease, mainPest);

        // Réponse finale structurée
        res.json({
            success: true,
            trackingId: trackingId,
            overallDiagnosis: { 
                species: mainSpecies, 
                disease: diseaseDetails || { label: mainDisease }, 
                pest: pestDetails || { label: mainPest }, 
                averageGravity: Math.round(avgGravity * 100) / 100 
            },
            evolution: { 
                advice: advice, 
                previousGravity: trackingRecord ? trackingRecord.last_gravity : null 
            },
            nextCheckup: { 
                date: nextCheckupData.nextDate, 
                urgencyLevel: nextCheckupData.urgencyLevel, 
                missedCount: nextCheckupData.missedCount 
            },
            recommendations: recommendations,
            imagesAnalyzed: uploadedUrls.length
        });

    } catch (error) {
        console.error("Erreur Controller (analyzeAndTrack) :", error);
        res.status(500).json({ error: "Échec de l'analyse : " + error.message });
    }
};

/**
 * Marque un suivi comme résolu (la plante est guérie).
 */
exports.resolveTracking = async (req, res) => {
    try {
        const { trackingId } = req.params;
        await dbService.resolveTracking(trackingId);
        res.json({ success: true, message: "Le suivi a été clôturé avec succès." });
    } catch (error) {
        console.error("Erreur Controller (resolveTracking) :", error);
        res.status(500).json({ error: "Impossible de clôturer le suivi." });
    }
};