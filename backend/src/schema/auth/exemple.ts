const authTestParamsSchema = {
    $id: "authIdParams",
    type: "object",
    properties: {
        id: {
            type: "number"
        }
    }
}

export type authTestParams = {
    id: number
}
export default authTestParamsSchema;