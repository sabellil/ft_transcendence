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

	const [profile, setProfile] =
		useState<any>(null);
	
	const [friends, setFriends] =
		useState<any[]>([]);

  
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
		
		const profileResponse =
			await fetch(
				"http://localhost:3000/api/users/me",
				{
					headers:
					{
						Authorization:
						`Bearer ${data.token}`//envoie le token de connexion dans les headers pour acceder au profil du user
					}
				}
			);
		const profileData = await profileResponse.json();
		setProfile(profileData);

		const friendsResponse =
			await fetch(
				"http://localhost:3000/api/friends",
				{
					headers:
					{
						Authorization:
						`Bearer ${data.token}}`
					}
				}
			);
			const friendsData = await friendsResponse.json();
			setFriends(friendsData);
		}
	if (profile)
		{
			return (
			<div>
				<h2>Profile</h2>
				<p>Username: {profile.username}</p>
				<p>Email: {profile.email}</p>
				<p>Online: {String(profile.isOnline)}</p>
				<p>Avatar: {profile.avatar}</p>

				<h2>Friends</h2>
				{
					friends.map((friend:any) => (
						<div key={friend.id} >
							{friend.username}
							- Online: {String(friend.isOnline)}
						</div>
					))
				}
				
			</div>
			)
		}

	return (
		//Need to ecrire du html React ici ! affichage de la page, formulaire de login
  <div>
      <h1>Login</h1>
      <input
        type = "email"
        placeholder ="email"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <br/>
      <input
        type = "password"
        placeholder ="password"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />
      <br/>
      <button onClick={login}>Login</button>
      <p>
        Token;
      </p>
      <p>
        {token}
      </p>
	  {
		
	  }
  </div>

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