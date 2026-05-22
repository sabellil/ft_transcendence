async function friendsRoutes(app, options)//option eventuelles config ou plugins pour plus tard?
{
    app.get("/test", async (request, reply) =>
    {
        return {
            message: "Friends route works"
        };
    });
}

export default friendsRoutes;

//ajout ou suppression d'un ami
//async = la fonction peut attendre qqch de long (backend attend bdd)