async function orgRoutes(app, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Organizations route works"
        };
    });
}

export default orgRoutes;

//organisations