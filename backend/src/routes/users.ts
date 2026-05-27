
import {
    authMiddleware 
} from "../middleware/authMiddleware.js";

import type { FastifyInstance } from "fastify";

import {
    getMe, 
    updateMe
} from "../controllers/usersController.js";

async function usersRoutes(app: FastifyInstance, options)
{
    app.addHook("preHandler", authMiddleware);//middleware pour auth avant chaque route, sinon error 401 unauthorized
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Users route works"
        };
    });
    app.get(
		"/me",
		async (request, reply) =>
		{
			const user =
				request.user as {
					id:number
				};

			return await getMe(
				user.id
			);
		}
	);

	app.put(
		"/me",
		async (request, reply) =>
		{
			const user =
				request.user as {
					id:number
				};

			const {
				username
			} =
			request.body as {
				username:string
			};

			return await updateMe(
				user.id,
				username
			);
		}
	);


}

export default usersRoutes;

//profil, update du profil