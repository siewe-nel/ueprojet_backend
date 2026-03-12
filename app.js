// ============================================================================
// FICHIER     : server.js
// EMPLACEMENT : Racine du projet (./server.js)
// RÔLE        : Point d'entrée principal de l'API Node.js
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const trackingRoutes = require('./routes/tracking.routes');
const userRoutes = require('./routes/user.routes');
const fieldRoutes = require('./routes/field.routes'); // Ajout de la route

const app = express();

const dirs = ['./ml_models'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Les 3 modules de ton API
app.use('/api/users', userRoutes);
app.use('/api/fields', fieldRoutes);   // Module des champs
app.use('/api/tracking', trackingRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: "✅ Serveur Plant Expert Opérationnel" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
// export
module.exports = app;