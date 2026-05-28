//importation d'outils React, useState stocke les donnees et useEffect execute le code autom.
import { useEffect, useState } from "react";

//composant principal React qui decrit ce que la page doit afficher
function App()
{
  //declaration de 3 variables d'etat pour stocker les donnees du formulaire et le token de connexion
	const [email, setEmail] =
		useState("");

	const [password, setPassword] =
		useState("");

	const [token, setToken] =
		useState("");
  
  //fonction qui s'execute au clic du bouton de login
	async function login()
	{
		const response =
			await fetch(//envoie une requete HTTP au backend pour se connecter
				"http://localhost:3000/api/auth/login",
				{
					method: "POST",
					headers:
					{
						"Content-Type":
						"application/json"
					},
					body: JSON.stringify({//transforme les donnees du formulaire en JSON pour les envoyer au backend
						email,
						password
					})
				}
			);

		const data =
			await response.json();
    //stocke le token de connexion recu du backend dans la variable d'etat token
		setToken(data.token);
	}

	return (
		//Need to ecrire du html React ici ! affichage de la page, formulaire de login
	);
}

//autoriser les autres fichiers a utilsier cette fonction 
export default App;
/*
fecth retourne une reponse en HTTP brute
res.json lit le body JSON de la reponse et retourne un object JavaScript
data contient desormais cet objet et update message a l'aide de setMessage

tableau [] --> quelles donnees doivent declencher un nouveua useEffect ?
vide ici donc aucune dependance donc une fois au chargement de la page
*/