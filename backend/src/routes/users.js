async function usersRoutes(app, options)
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Users route works"
        };
    });
}

module.exports = usersRoutes;

//profil, update du profil