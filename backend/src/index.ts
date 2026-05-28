import Fastify from "fastify";//importation de la biblio fastify


const app = Fastify({//creation serveur fastify
   logger: true//pour afficher les infos autom. dans le terminal
});

import fastifyCors from "@fastify/cors";
app.register(fastifyCors);// branchement systeme de plugins

import multipart from "@fastify/multipart";
app.register(multipart);//pour gerer les fichiers envoyes par le client (avatar)

//checker cors origin
//checke rcookie, 
//mysql et  postegres (peut ps passer pour postgre ca rjai prisma)
//rout epour voir les orutes corretcemen tenregistrer, pratique pour debug 
//importation des routes
import authRoutes from "./routes/auth.ts";
import usersRoutes from "./routes/users.ts";
import friendsRoutes from "./routes/friends.ts";
import orgRoutes from "./routes/orgs.ts";


//branchement des routes syr /api/auth (API REST)
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

