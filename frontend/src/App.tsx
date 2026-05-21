//importation d'outils React, useState stocke les donnees et useEffect execute le code autom.
import { useEffect, useState } from "react";

//composant principal React qui decrit ce que la page doit afficher
function App(){
  const [message, setMessage] = useState("");//message = "hello from backend" du package.json, setMessage pour modifier message, mais ici vide
  useEffect(() => {//exec du code autom. qund la page charge
    fetch("http://localhost:3000/api/test")//frontend appelle le backend  en enovyant une requete HTTP vers local...
      .then((res) => res.json())//recupere la res (reponse http brute) et la convertit en Javascript
      .then((data) => {
          setMessage(data.message);
      });
  }, []);//[] --> n'effectuer useEffect qu'une fois au chargement de la page
  return (
    <div>
      <h1>{message}</h1>
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