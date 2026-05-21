async function orgRoutes(app, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Organizations route works"
        };
    });
}

module.exports = orgRoutes;

//organisations