//image Docker deja prete
FROM node:20-alpine

//dossier de travail dans le conteneur
WORKDIR /app

//copie de package.json et package-lock.json dans le conteneur
COPY package*.json ./

//installation des dependances Nodes (fastify, prisma etc) dans le conteneur
RUN npm install

//copie de tout le backend dans le conteneur
COPY . .

//app backend ecoute sur le port 3000 a linterieur du conteneur
EXPOSE 3000

//commandes executees autom. quand le conteneur demarre
CMD ["npm", "run", "dev"]
