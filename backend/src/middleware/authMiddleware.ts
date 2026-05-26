import jwt from "jsonwebtoken";

export async function authMiddleware(
	request,
	reply
)
{
	const auth =
		request.headers.authorization;

	if (!auth)
	{
		return reply
			.status(401)
			.send({
				error:
				"Unauthorized"
			});
	}

	const token =
		auth.replace(
			"Bearer ",
			""
		);

	try
	{
		const decoded =
			jwt.verify(
				token,
				process.env.JWT_SECRET!
			);

		request.user =
			decoded;

	}
	catch
	{
		return reply
			.status(401)
			.send({
				error:
				"Invalid token"
			});
	}
}