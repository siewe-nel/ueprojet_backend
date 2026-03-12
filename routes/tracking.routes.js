// ============================================================================
// FICHIER     : tracking.routes.js
// EMPLACEMENT : src/routes/tracking.routes.js
// ============================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const trackingController = require('../controllers/tracking.controller');

// NOUVEAU : On utilise memoryStorage. 
// Les images interceptées restent dans la RAM sous forme de "buffer".
const upload = multer({ storage: multer.memoryStorage() });

// On applique le middleware 'upload.array' sur notre route
router.post('/analyze', upload.array('images', 5), trackingController.analyzeAndTrack);
router.post('/resolve/:trackingId', trackingController.resolveTracking);

module.exports = router;