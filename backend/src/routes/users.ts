
import {
    authMiddleware 
} from "../middleware/authMiddleware.js";

import type { FastifyInstance } from "fastify";

async function usersRoutes(app: FastifyInstance, options)
{
    app.addHook("preHandler", authMiddleware);//middleware pour auth avant chaque route, sinon error 401 unauthorized
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Users route works"
        };
    });
}

export default usersRoutes;

//profil, update du profil