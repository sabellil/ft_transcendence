import crypto from "node:crypto";


import fs from "fs";


import path from "path";


import type { FastifyRequest, FastifyReply } from "fastify";


import type { ZodType } from "zod";


import jwt from "jsonwebtoken";


import { prisma, JWT_SECRET, ALLOWED_MIME, MAX_FILE_SIZE, MIME_TO_EXT } from "./constants.ts";










// requireAuth — verify JWT token and attach user to request
export async function requireAuth(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// extractToken — get token from cookie or authorization header
	const token = extractToken(request);

	// !token → request has no token
	if (!token) {
		return reply.status(401).send({ error: "error.unauthorized" });
	}

	// try verify JWT token
	let payload: { id: number };
	try {
		payload = jwt.verify(token, JWT_SECRET) as { id: number };
	// catch invalid/expired token
	} catch {
		return reply.status(401).send({ error: "error.invalidToken" });
	}

	// findUnique — load user from database by token id
	const user = await prisma.user.findUnique({
		where:  { id: payload.id },
		select: { id: true, username: true, role: true },
	});

	// !user → user deleted or not found
	if (!user) {
		return reply.status(401).send({ error: "error.invalidToken" });
	}

	request.user = user;
}





// requireAdmin — ensure authenticated user has Admin role
export async function requireAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// !request.user || role not Admin → reject
	if (!request.user || request.user.role !== "Admin") {
		return reply.status(403).send({ error: "error.notAdmin" });
	}
}





// requireModerator — ensure authenticated user has Moderator or Admin role
export async function requireModerator(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// !request.user || role not Moderator/Admin → reject
	if (!request.user || (request.user.role !== "Moderator" && request.user.role !== "Admin")) {
		return reply.status(403).send({ error: "error.notModerator" });
	}
}





// extractToken — extract Bearer token from cookie or Authorization header
function extractToken(request: FastifyRequest): string | undefined {
	// cookies.token → use cookie token
	if (request.cookies?.token) return request.cookies.token;

	// Authorization header → strip Bearer prefix
	const header = request.headers.authorization;
	if (header) return header.replace(/^Bearer\s+/i, "");

	return undefined;
}





type RouteFn = (request: FastifyRequest, reply: FastifyReply) => Promise<any>;





// wrapHandler — wrap route handler with unified error handling
export function wrapHandler(fn: RouteFn): RouteFn {
	return async (request, reply) => {
		// try execute route handler
		try {
			const result = await fn(request, reply);
			// result !== undefined → return response
			if (result !== undefined) return result;
		// catch route handler errors
		} catch (err: any) {
			// err?.code === "P2002" → unique constraint conflict
			if (err?.code === "P2002") {
				return reply.status(409).send({ error: "error.conflict" });
			}
			// Prisma error code → database error
			if (err?.code?.startsWith("P")) {
				return reply.status(400).send({ error: "error.databaseError" });
			}
			// error. prefix → known application error
			if (typeof err?.message === "string" && err.message.startsWith("error.")) {
				return reply.status(400).send({ error: err.message });
			}
			// unknown error → internal server error
			return reply.status(500).send({ error: "error.internalError" });
		}
	};
}





// validateBody — parse and validate request body with Zod schema
export function validateBody<T>(
	schema: ZodType<T>,
	data: unknown,
	reply: FastifyReply,
): T | null {
	const parsed = schema.safeParse(data);
	// !parsed.success → validation failed
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message ?? "Validation failed";
		reply.status(400).send({ error: msg });
		return null;
	}
	return parsed.data;
}





// validateMultipart — extract, validate, and buffer uploaded file
export async function validateMultipart(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// request.file — get uploaded file from multipart request
	const file = await request.file();

	// !file → no file uploaded
	if (!file) {
		reply.status(400).send({ error: "error.noFile" });
		return null;
	}

	// !ALLOWED_MIME → unsupported file type
	if (!ALLOWED_MIME.includes(file.mimetype)) {
		reply.status(400).send({ error: "validation.invalidFileType" });
		return null;
	}

	// toBuffer — read file contents into memory
	const buffer = await file.toBuffer();

	// buffer.length > MAX_FILE_SIZE → file too large
	if (buffer.length > MAX_FILE_SIZE) {
		reply.status(400).send({ error: "validation.fileTooLarge" });
		return null;
	}

	const fields: Record<string, { value: string }> = (file as Record<string, any>).fields || {};

	return { file, buffer, fields };
}





// saveUploadedFile — persist uploaded file to disk, clean up old file
export async function saveUploadedFile(
	dir: string,
	mimetype: string,
	buffer: Buffer,
	oldPath?: string,
): Promise<string> {
	// mkdir — ensure upload directory exists
	await fs.promises.mkdir(dir, { recursive: true });

	const ext = MIME_TO_EXT[mimetype] || ".png";
	const diskPath = path.join(dir, `${crypto.randomUUID()}${ext}`);

	// oldPath → delete previous file
	if (oldPath) {
		await fs.promises.unlink("." + oldPath).catch(() => {});
	}

	// writeFile — write buffer to disk
	await fs.promises.writeFile(diskPath, buffer);

	return "/" + diskPath;
}
