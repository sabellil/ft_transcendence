import { 
    authMiddleware 
} from "../middleware/authMiddleware.js";
async function orgRoutes(app, options)
{
    app.addHook("preHandler", authMiddleware);//middleware pour auth avant chaque route, sinon error 401 unauthorized
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Organizations route works"
        };
    });
}

export default orgRoutes;

//organisations