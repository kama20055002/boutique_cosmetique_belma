const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'boutique_cosmetiques'
});

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion MySQL :', err);
        return;
    }

    console.log('Connexion à MySQL réussie !');
});

module.exports = db;