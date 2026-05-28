import {
    authMiddleware 
} from "../middleware/authMiddleware.js";

import type { FastifyInstance } from "fastify";

import fs from "fs";
import path from "path";

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
		});
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
		});
	app.post(
	"/avatar",
	async (request, reply) =>
	{
		const data =
			await request.file();

		if (!data)
		{
			return reply.status(400).send({
				error:"No file"
			});
		}

		const user =
			request.user;

		const fileName =
			`${user.id}-${data.filename}`;

		const filePath =
			path.join(
				"uploads/avatars",
				fileName
			);

		const buffer =
			await data.toBuffer();

		fs.writeFileSync(
			filePath,
			buffer
		);

		return {
			message:"Avatar uploaded",
			path:filePath
		};
	});
}

export default usersRoutes;

//profil, update du profil