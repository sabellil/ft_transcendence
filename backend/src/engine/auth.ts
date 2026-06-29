import bcrypt from "bcrypt";


import jwt from "jsonwebtoken";


import type { FastifyInstance } from "fastify";


import { UserStatus } from "@prisma/client";


import { requireAuth, wrapHandler, validateBody } from "../middleware.ts";


import { registerSchema, loginSchema } from "../validation.ts";


import { prisma, JWT_SECRET, COOKIE_MAX_AGE, TOKEN_EXPIRY, HASH_SECRET } from "../constants.ts";


import { createUser } from "./users.ts";










// COOKIE_OPTS — shared cookie configuration for auth tokens
const COOKIE_OPTS = {
	httpOnly: true,
	sameSite: "strict" as const,
	path:     "/",
	secure:   true,
	maxAge:   COOKIE_MAX_AGE,
};





// loginUser — verify credentials with timing-safe dummy hash comparison
async function loginUser(username: string, password: string) {
	// findUnique — resolve username to user record (case-insensitive)
	const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });

	// !user → dummy compare then reject
	if (!user) {
		await bcrypt.compare(password, HASH_SECRET);
		throw new Error("error.invalidCredentials");
	}

	// compare — verify password against stored hash
	const valid = await bcrypt.compare(password, user.password);

	// !valid → wrong password, reject login
	if (!valid) {
		throw new Error("error.invalidCredentials");
	}

	// sign — create JWT token for session
	const token = jwt.sign(
		{ id: user.id },
		JWT_SECRET,
		{ expiresIn: TOKEN_EXPIRY },
	);

	// update — mark user online after login
	await prisma.user.update({
		where: { id: user.id },
		data:  { status: UserStatus.Online },
	});

	return token;
}





// logoutUser — mark user offline so friends see correct status
async function logoutUser(username: string) {
	// update — mark user offline on logout
	await prisma.user.update({
		where: { username },
		data:  { status: UserStatus.Offline },
	});

	return { success: true };
}





// authRoutes — register auth endpoints on Fastify instance
async function authRoutes(app: FastifyInstance) {
	app.post("/register", wrapHandler(async (request, reply) => {
		// validateBody — parse registration data
		const data = validateBody(registerSchema, request.body, reply);
		// !data → invalid input, stop processing
		if (!data) return;

		// createUser — register new user in database
		return reply.status(201).send(await createUser(data.email, data.username, data.password));
	}));

	app.post("/login", wrapHandler(async (request, reply) => {
		// validateBody — parse login data
		const data = validateBody(loginSchema, request.body, reply);
		// !data → invalid input, stop processing
		if (!data) return;

		// loginUser — verify credentials and create session
		const token = await loginUser(data.username, data.password);

		// setCookie — store JWT in HTTP-only secure cookie
		reply.setCookie("token", token, COOKIE_OPTS);

		return { token };
	}));

	app.post("/logout", { preHandler: requireAuth }, wrapHandler(async (request, reply) => {
		const user = request.user;

		// logoutUser — mark user offline
		await logoutUser(user.username);

		// clearCookie — remove JWT cookie from client
		reply.clearCookie("token", { path: "/", secure: true, sameSite: "strict" });

		return { success: true };
	}));
}










export default authRoutes;
