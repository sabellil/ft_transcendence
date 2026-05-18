const express = require("express");//importation de la biblio Express, comme un include

const app = express();//serveur backend

app.get("/", (req, res) => {//route HTTP GET, / page principale du backend
    res.send("Backend running");//envoie reponse texte au navigateur
});//ferme la route GET
//request recue du client : contient URL body header user etc
//response envoyee au client

app.listen(3000, () => {//demarre le serveur sur le port 3000, backend ecoute localhost:3000
    console.log("Server running on port 3000");//msg affiche dans le terminal quand le serveur demarre
});