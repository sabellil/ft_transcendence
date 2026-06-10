import { createOrganization, getOrganizations, getOrganizationById, udpateOrganization, deleteOrganization, addUserToOrganization, removeUserFromOrganization } from "../controllers/orgsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";


//fonction qui enregistre toutes les routes liees aux orgs
async function orgRoutes(app, options) {
  app.addHook("preHandler", authMiddleware); //middleware pour auth avant chaque route, sinon error 401 unauthorized
  app.get("/test", async (request, reply) => {
    return {
      message: "Organizations route works",
    };
  });
  app.post("/", async (request, reply) => {//creation d'org 
    const user = request.user as {//recup user id depuis le token
      id:number;
    };
    const { name } = request.body as {//recup name de l'org depuis le body
      name:string;
    };
    return await createOrganization(name, user.id);//appel de controller et renvoi du resultat au client
  });
  app.get("/", async (request, reply) => {//voir toutes les orgs 
    return await getOrganizations();
  });
  app.get("/:id", async (request, reply) => {
		const { id } = request.params as {
			id:string;
		};
		return await getOrganizationById(
			Number(id)
		);
	});
  app.put("/:id", async (request, reply) => {
    const user = request.user as {
      id:number;

    };
    const { id } = request.params as {
      id:string;
    };
    const { name } = request.body as {
      name:string;
    };
    return await udpateOrganization(Number(id), name, user.id);
  });
  app.delete("/:id", async (request, reply) => {
	  const user = request.user as {
		  id:number;
	  };
    const { id } = request.params as {
		  id:string;
	  };
    return await deleteOrganization(Number(id), user.id);
  });
  app.post("/:id/users/:userId", async (request, reply) => {
    const user = request.user as {
      id:number;
		};
		const { id, userId } = request.params as {
			id:string;
			userId:string;
		};
		return await addUserToOrganization(Number(id), Number(userId), user.id);
	});
  app.delete("/:id/users/:userId", async (request, reply) => {
    const user = request.user as {
			id:number;
		};
    const { id, userId } = request.params as {
			id:string;
			userId:string;
		};
    return await removeUserFromOrganization(Number(id), Number(userId), user.id);
	});
}

export default orgRoutes;

//organisations
/*

An organization system:
◦ Create, edit, and delete organizations.
◦ Add users to organizations.
◦ Remove users from organizations.
◦ View organizations and allow users to perform specific actions within an or-
ganization (minimum: create, read, update)



*/
