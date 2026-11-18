const express = require('express');

const app = express();
const db = require('./config/db');
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Bienvenue dans notre boutique de cosmétiques !');
});

const catalogueRoutes = require('./routes/catalogueRoutes');
app.use('/api/catalogue', catalogueRoutes);
const panierRoutes = require('./routes/panierRoutes');
app.use('/api/panier', panierRoutes);
const gestionRoutes = require('./routes/gestionRoutes');
app.use('/api/gestion', gestionRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});