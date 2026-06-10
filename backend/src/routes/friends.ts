import { 
    authMiddleware 
} from "../middleware/authMiddleware.js";

import {
	getFriends,
	addFriend,
    getPendingFriends,
	acceptFriend,
	refuseFriend,
	removeFriend
}
from "../controllers/friendsController.js";

import { request } from "http";

async function friendsRoutes(app, options)//option eventuelles config ou plugins pour plus tard?
{
    app.addHook("preHandler", authMiddleware);//middleware pour auth avant chaque route, sinon error 401 unauthorized
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Friends route works"
        };
    });
    app.get("/", async (request, reply) => {
		const user =
			request.user as {
				id:number
			};

		const friends =
			await getFriends(
				user.id
			);

		return friends;
	});
    app.post("/add/:id", async (request, reply) => {
		const user =
			request.user as {
				id:number
			};

		const {
			id
		} =
		request.params as {
			id:string
		};

		const friend =
			await addFriend(
				user.id,
				Number(id)
			);

		return friend;
	});
    app.get("/pending", async (request, reply) => {
		const user =
			request.user as {
				id:number
			};
		return await getPendingFriends(
			user.id
		);
	});
	app.post("/accept/:id", async (request, reply) => {	
		const user = request.user as {
			id:number
		};
		const {
			id
		} =
		request.params as {
			id:string
		};

		return await acceptFriend(
			Number(id),
			user.id
		);
	});
	app.post("/refuse/:id", async (request, reply) => {
		const user = request.user as {
			id:number
		};
		const {
			id
		} =
		request.params as {
			id:string
		};

		return await refuseFriend(
			Number(id),
			user.id
		);
	});
	app.delete("/:id", async (request, reply) => {
		const {
			id
		} =
		request.params as {
			id:string
		};

		return await removeFriend(
			Number(id)
		);
	}
);

}

export default friendsRoutes;

//ajout ou suppression d'un ami
//async = la fonction peut attendre qqch de long (backend attend bdd)