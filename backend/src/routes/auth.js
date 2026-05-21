async function authRoutes(app, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Auth route works"
        };
    });
}

module.export = authRoutes;//rend authRoutes utilisable depuis index.js

//pour login register logout