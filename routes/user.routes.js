const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Route pour l'inscription d'un nouvel agriculteur/utilisateur
router.post('/register', userController.register);

// Route pour la connexion
router.post('/login', userController.login);

// Route pour récupérer les infos du profil
router.get('/profile/:userId', userController.getProfile);

module.exports = router;