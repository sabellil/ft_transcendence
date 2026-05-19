const express = require("express");//importation de la biblio Express, comme un include
const cors = require("cors");
const app = express();//serveur backend
app.use(cors());

app.get("/", (req, res) => {//route HTTP GET, / page principale du backend
    res.send("Backend running");//envoie reponse texte au navigateur
});//ferme la route GET
//request recue du client : contient URL body header user etc
//response envoyee au client

app.get("/api/test", (req, res) => {
    res.json({
        message: "Hello from backend"
    });
});

app.listen(3000, () => {//demarre le serveur sur le port 3000, backend ecoute localhost:3000
    console.log("Server running on port 3000");//msg affiche dans le terminal quand le serveur demarre
});

/*
TODO connect frontend to backend --> besoin de route API backend 
Process: 
- Frontend React demande a voir mon profil avec GET /api/users/me
- Backend recoit la req, verifie le token JWT, cherche les infos en bdd et renvoie la resq. 
*/