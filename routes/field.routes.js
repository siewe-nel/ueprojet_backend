const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/field.controller');

// Créer un nouveau champ
router.post('/create', fieldController.createField);

// Récupérer tous les champs d'un utilisateur spécifique
router.get('/user/:userId', fieldController.getUserFields);

module.exports = router;