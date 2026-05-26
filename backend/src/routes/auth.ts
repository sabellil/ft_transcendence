import type { FastifyInstance, FastifyRequest } from "fastify";
import type { authTestParams } from "../schema/auth/exemple.ts";
import authTestParamsSchema from "../schema/auth/exemple.ts";

import {
	registerUser,
	loginUser
} from "../controllers/authController.js";

import {
	authMiddleware
}
from "../middleware/authMiddleware.js";

	async function authRoutes(
	app: FastifyInstance,
	options
)
{
	app.addSchema(authTestParamsSchema);

	app.get(
		"/",
		async (
			request: FastifyRequest,
			reply
		) =>
		{
			return {
				message: "Auth route work"
			};
		}
	);

	app.get(
		"/:id",
		{
			schema:
			{
				params:
				{
					$ref: "authIdParams#"
				}
			}
		},
		async (
			request: FastifyRequest<{
				Params: authTestParams
			}>,
			reply
		) =>
		{
			const { id } = request.params;

			return {
				message: `Auth route work ${id}`
			};
		}
	);

	app.get(
		"/:id/avatar",
		{
			schema:
			{
				params:
				{
					$ref: "authIdParams#"
				}
			}
		},
		async (
			request: FastifyRequest<{
				Params: authTestParams
			}>,
			reply
		) =>
		{
			const { id } = request.params;

			if (id == 5)
			{
				return {
					message: "je suis special"
				};
			}

			return {
				message:
				`Auth route avatar work ${id}`
			};
		}
	);

	app.post(
		"/register",
		async (request, reply) =>
		{
			const {
				email,
				username,
				password
			} =
			request.body as {
				email: string;
				username: string;
				password: string;
			};

			const user =
				await registerUser(
					email,
					username,
					password
				);

			return reply
				.status(201)
				.send({
					id: user.id,
					email: user.email,
					username: user.username
				});
		}
	);

	app.post(
		"/login",
		async (request, reply) =>
		{
			const {
				email,
				password
			} =
			request.body as {
				email: string;
				password: string;
			};

			const token =
				await loginUser(
					email,
					password
				);

			return {
				token
			};
		}
	);

	app.post(
		"/logout",
		{
			preHandler: authMiddleware
		},
		async (request, reply) =>
		{
			return {
				message:
				"Logout successful"
			};
		}
	);
}
export default authRoutes;//rend authRoutes utilisable depuis index.js (TODO export e tmeyrte en tx)

//pour login register logout