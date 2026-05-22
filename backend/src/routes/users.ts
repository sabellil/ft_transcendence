import type { FastifyInstance } from "fastify";

async function usersRoutes(app: FastifyInstance, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Users route works"
        };
    });
}

export default usersRoutes;

//profil, update du profil