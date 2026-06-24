import process from "node:process";


import fs from "fs";


import path from "path";


import Fastify from "fastify";


import fastifyCors from "@fastify/cors";


import fastifyCookie from "@fastify/cookie";


import multipart from "@fastify/multipart";


import fastifyStatic from "@fastify/static";


import fastifyRateLimit from "@fastify/rate-limit";


import { UserStatus } from "@prisma/client";


import { prisma } from "./constants.ts";


import {
	JWT_SECRET, BODY_LIMIT, MAX_FILE_SIZE, RATE_LIMIT_AUTH, RATE_LIMIT_GLOBAL,
	ALLOWED_ORIGIN_HOSTS,
} from "./constants.ts";


import authRoutes    from "./engine/auth.ts";


import usersRoutes   from "./engine/users.ts";


import friendsRoutes from "./engine/friends.ts";


import { blocksRoutes } from "./engine/friends.ts";


import guildsRoutes  from "./engine/guilds.ts";


import cardsRoutes   from "./engine/cards.ts";





declare module "fastify" {
	interface FastifyRequest {
		user: { id: number; username: string; role: string };
	}
}





// createApp — assemble and configure the Fastify application
// httpsOpts — { key, cert } Buffers for HTTPS (loaded and passed by server.ts)
export async function createApp(httpsOpts: { key: Buffer; cert: Buffer }) {

	// mkdirSync — ensure upload directories exist on startup
	fs.mkdirSync("uploads", { recursive: true });
	fs.mkdirSync("uploads/avatars", { recursive: true });
	fs.mkdirSync("uploads/banners", { recursive: true });
	fs.mkdirSync("uploads/cards", { recursive: true });





	// app — create Fastify HTTPS server instance
	const app = Fastify({
		logger: true,
		https: { key: httpsOpts.key, cert: httpsOpts.cert },
		bodyLimit: BODY_LIMIT,
	});





	// register fastifyCors — CORS with dynamic origin validation
	await app.register(fastifyCors, {
		origin: (origin, cb) => {
			// !origin → no origin header, allow
			if (!origin) return cb(null, true);
			// try parse origin URL
			try {
				const url = new URL(origin);
				cb(null, ALLOWED_ORIGIN_HOSTS.includes(url.hostname));
			// catch invalid URL → deny
			} catch { cb(null, false); }
		},
		credentials: true,
	});


	// register fastifyCookie — cookie parsing with JWT secret
	await app.register(fastifyCookie, { secret: JWT_SECRET });


	// register multipart — file upload support with size limit
	await app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });


	// register fastifyStatic — serve uploaded files
	await app.register(fastifyStatic, {
		root: path.join(process.cwd(), "uploads"),
		prefix: "/uploads/",
	});





	// auth scope — rate-limited auth routes
	app.register(async (scope) => {
		await scope.register(fastifyRateLimit, RATE_LIMIT_AUTH);
		await scope.register(authRoutes, { prefix: "/api/auth" });
	});


	// global scope — rate-limited API routes
	app.register(async (scope) => {
		await scope.register(fastifyRateLimit, RATE_LIMIT_GLOBAL);
		await scope.register(usersRoutes,   { prefix: "/api/user"   });
		await scope.register(friendsRoutes, { prefix: "/api/friend" });
		await scope.register(blocksRoutes,  { prefix: "/api/block"  });
		await scope.register(guildsRoutes,  { prefix: "/api/guild"  });
		await scope.register(cardsRoutes,   { prefix: "/api/card"   });
	});





	// setErrorHandler — unified error response handler
	app.setErrorHandler((error: any, _request, reply) => {
		app.log.error(error);
		reply.status(error.statusCode || 500).send({ error: "error.internalError" });
	});


	// addHook onReady — reset all users to offline on server startup
	app.addHook("onReady", async () => {
		// updateMany — set all users offline
		await prisma.user.updateMany({ data: { status: UserStatus.Offline } }).catch(() => {});
	});


	return app;
}





// shutdown — gracefully close server and database connections
export async function shutdown(app: ReturnType<typeof Fastify>, _signal: string) {
	// try close server and disconnect Prisma
	try {
		await app.close();
		await prisma.$disconnect();
		process.exit(0);
	// catch shutdown errors → force exit
	} catch { process.exit(1); }
}
