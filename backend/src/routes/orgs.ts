import { createOrganization, getOrganizations, udpateOrganization } from "../controllers/orgsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

async function orgRoutes(app, options) {
  app.addHook("preHandler", authMiddleware); //middleware pour auth avant chaque route, sinon error 401 unauthorized
  app.get("/test", async (request, reply) => {
    return {
      message: "Organizations route works",
    };
  });
  app.post("/", async (request, reply) => {
    const user = request.user as {
      id:number;
    };
    const { name } = request.body as {
      name:string;
    };
    return await createOrganization(name, user.id);
  });
  app.get("/", async (request, reply) => {
    return await getOrganizations();
  });
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as {
      id:string;
    };
    const { name } = request.body as {
      name:string;
    };
    return await udpateOrganization(Number(id), name);
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
