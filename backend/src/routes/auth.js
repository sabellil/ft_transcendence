async function authRoutes(app, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Auth route works"
        };
    });
}

module.exports = authRoutes;//rend authRoutes utilisable depuis index.js

//pour login register logout