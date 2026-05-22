const Fastify = require("fastify");//importation de la biblio fastify


const app = Fastify({//creation serveur fastify
   logger: true//pour afficher les infos autom. dans le terminal
});


app.register(require("@fastify/cors"));// branchement systeme de plugins


//importation des routes
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const friendsRoutes = require("./routes/friends");
const orgRoutes = require("./routes/orgs");


//branchement des routes syr /api/auth
app.register(authRoutes, {
   prefix: "/api/auth"
});


app.register(usersRoutes, {
   prefix: "/api/users"
});


app.register(friendsRoutes, {
   prefix: "/api/friends"
});


app.register(orgRoutes, {
   prefix: "/api/orgs"
});


//creation rout principale pour confirmer que le backend tourne bien
app.get("/", async (request, reply) => {
   return "Backend running";
});


//demarre le serveur sur le port 3000 accesisble depuis DOcker et le reseau
app.listen({
port:3000,
host:"0.0.0.0"
});

