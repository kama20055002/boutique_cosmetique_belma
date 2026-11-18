# Déploiement

L'application se déploie avec Docker Compose : MySQL, l'API Node.js, et Caddy (HTTPS automatique
et service du frontend). Une seule commande démarre l'ensemble.

## Ce qu'il faut

- Un serveur Linux (VPS) avec Docker et le plugin Compose installés, ports 80 et 443 ouverts.
- Un nom de domaine dont l'enregistrement DNS **A** pointe vers l'adresse IP du serveur
  (nécessaire pour le certificat HTTPS). Sans domaine, utiliser `DOMAINE=localhost` pour tester.

## Étapes

1. **Récupérer le code** sur le serveur :
   ```bash
   git clone https://github.com/NOM_UTILISATEUR/boutique-cosmetique.git
   cd boutique-cosmetique
   ```

2. **Configurer** :
   ```bash
   cp .env.example .env
   nano .env
   ```
   À remplir absolument : `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`
   (générer avec `openssl rand -hex 32`), `DOMAINE`, `FRONTEND_URL` (`https://votre-domaine.com`).

3. **Construire le frontend** (sur n'importe quelle machine, puis copier le dossier sur le serveur
   dans `frontend/dist`) :
   ```bash
   cd frontend && npm install && npm run build
   ```

4. **Démarrer** :
   ```bash
   docker compose up -d --build
   docker compose ps          # db, app et caddy doivent être « running » / « healthy »
   ```
   Au premier démarrage, MySQL exécute `database/schema.sql` et crée les 12 tables et les 3 rôles.

5. **Vérifier** : ouvrir `https://votre-domaine.com/api/sante`. Réponse attendue :
   `{"statut":"ok","base_de_donnees":"ok"}`.

6. **Créer le premier compte administrateur** :
   ```bash
   docker compose exec -e STAFF_PASSWORD='MotDePasse123' app \
     node scripts/creer-staff.js admin@exemple.com Prenom Nom administrateur
   ```

## Test automatique après la mise en ligne

```bash
./scripts/test-production.sh https://votre-domaine.com
```

## Liste de vérification en production

- [ ] Le site s'ouvre en HTTPS (cadenas) et `http://` redirige vers `https://`.
- [ ] Inscription puis connexion d'un client.
- [ ] Ajout au panier, création de la commande, paiement simulé **accepté** : la commande passe
      à « confirmée » et le stock diminue.
- [ ] Paiement simulé **refusé** : la commande reste en attente, le stock ne change pas.
- [ ] Annulation d'une commande confirmée : stock rétabli et remboursement visible dans `/api/paiements`.
- [ ] Un client ne voit pas les commandes d'un autre client (réponse 404).
- [ ] `docker compose exec db mysql -u root -p -e "SHOW TABLES" boutique_cosmetique` liste 12 tables.

## Exploitation

```bash
docker compose logs -f app                 # journaux de l'API
docker compose restart app                 # redémarrer l'API

# Sauvegarde de la base
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" boutique_cosmetique' > sauvegarde.sql

# Mise à jour après un git push de l'équipe
git pull && docker compose up -d --build
```

## Points d'attention

- `schema.sql` ne s'exécute qu'à la **création** du volume MySQL. Pour modifier le schéma ensuite,
  utiliser des commandes `ALTER TABLE` ; supprimer le volume (`docker compose down -v`) efface toutes les données.
- Le fichier `.env` contient des secrets : il ne doit jamais être poussé sur GitHub (il est dans `.gitignore`).
- Après un premier `npm install` dans `backend/`, ajouter `package-lock.json` à Git, puis remplacer
  `npm install --omit=dev` par `npm ci --omit=dev` dans `backend/Dockerfile` pour des installations reproductibles.
