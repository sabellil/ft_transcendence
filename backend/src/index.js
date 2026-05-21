const Fastify = require("fastify");//installation de la biblio, comme un include

const app = Fastify({
    logger: true
});

app.register(require("@fastify/cors"));

app.get("/", async (request, reply) => {//route HTTP GET, / page principale du backend

    return "Backend running";

});//ferme la route GET
//request recue du client : contient URL body header user etc
//reply envoyee au client

app.get("/api/test", async (request, reply) => {

    return {
        message: "Hello from backend"
    };

});

//autorisation des connexions internes, utiles plus tard pour Docker
app.listen({
    port: 3000,
    host: "0.0.0.0"
});

/*
TODO connect frontend to backend --> besoin de route API backend 
Process: 
- Frontend React demande a voir mon profil avec GET /api/users/me
- Backend Fastify recoit la req, verifie le token JWT, cherche les infos en bdd et renvoie la resq. 
*/