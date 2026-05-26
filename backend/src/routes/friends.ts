import { 
    authMiddleware 
} from "../middleware/authMiddleware.js";

async function friendsRoutes(app, options)//option eventuelles config ou plugins pour plus tard?
{
    app.addHook("preHandler", authMiddleware);//middleware pour auth avant chaque route, sinon error 401 unauthorized
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Friends route works"
        };
    });
}

export default friendsRoutes;

//ajout ou suppression d'un ami
//async = la fonction peut attendre qqch de long (backend attend bdd)