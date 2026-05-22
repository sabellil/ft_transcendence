import type { FastifyInstance, FastifyRequest } from "fastify";
import type { authTestParams } from "../schema/auth/exemple.ts";
import authTestParamsSchema from "../schema/auth/exemple.ts";

async function authRoutes(app: FastifyInstance, options)
{
    app.addSchema(authTestParamsSchema);
    app.get("/", async (request: FastifyRequest, reply) =>
    {
        return {
            message: `Auth route work`
        };
    });
    app.get("/:id",  {
        schema: {
            params: {
                $ref: "authIdParams#"
            }
        }
    } , async (request: FastifyRequest<{Params: authTestParams}>, reply) =>
    {
        const { id } = request.params;
        return {
            message: `Auth route work ${id}`
        };
    });
    app.get("/:id/avatar",  {
        schema: {
            params: {
                $ref: "authIdParams#"
            }
        }
    } , async (request: FastifyRequest<{Params: authTestParams}>, reply) =>
    {
        const { id } = request.params;
        if (id == 5){
            return { message: "je suis special"}
        }
        return {
            message: `Auth route avatar work ${id}`
        };
    });
}
export default authRoutes;//rend authRoutes utilisable depuis index.js (TODO export e tmeyrte en tx)

//pour login register logout