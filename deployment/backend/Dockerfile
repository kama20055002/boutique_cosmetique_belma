FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Dépendances d'abord (meilleur cache Docker).
# Après avoir commité package-lock.json, remplacer par : RUN npm ci --omit=dev
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

# L'application tourne avec un utilisateur non-root
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
