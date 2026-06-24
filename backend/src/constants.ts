import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";

import fs from "fs";




export const USERNAME_MIN   = 3;
export const USERNAME_MAX   = 30;

export const PASSWORD_MIN   = 8;
export const PASSWORD_MAX   = 60;

export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 30;








// databaseUrl — load PostgreSQL connection string
const databaseUrl = process.env.DATABASE_URL;


// databaseUrl missing → fatal
if (!databaseUrl) {
	throw new Error("FATAL: DATABASE_URL is required");
}





// adapter — create PostgreSQL adapter for Prisma
const adapter = new PrismaPg({ connectionString: databaseUrl });


// prisma — instantiate PrismaClient with PG adapter
const prisma = new PrismaClient({ adapter });


export { prisma };





// readSecret — read secret from file path or environment variable
function readSecret(name: string): string | undefined {
	// try file path from env
	const filePath = process.env[`${name}_FILE`];

	// filePath provided → read from file
	if (filePath) {
		// try read secret file
		try {
			return fs.readFileSync(filePath, "utf-8").trim();
		// catch read failure → log error
		} catch (e) {
			console.error(`Failed to read secret file ${filePath}:`, (e as Error).message);
		}
	}

	// fallback — return raw env value
	return process.env[name];
}





// rawJwtSecret — load JWT signing secret
const rawJwtSecret = readSecret("JWT_SECRET");


// JWT_SECRET missing → fatal
if (!rawJwtSecret) {
	throw new Error("FATAL: JWT_SECRET is required (set JWT_SECRET)");
}


export const JWT_SECRET = rawJwtSecret;





// rawHashSecret — load bcrypt hash secret
const rawHashSecret = readSecret("HASH_SECRET");


// HASH_SECRET missing → fatal
if (!rawHashSecret) {
	throw new Error("FATAL: HASH_SECRET is required (set HASH_SECRET)");
}


export const HASH_SECRET = rawHashSecret;





// DOMAIN — hostname for CORS origin and cookie scoping
const DOMAIN = process.env.DOMAIN || "localhost";


export const ALLOWED_ORIGIN_HOSTS = [DOMAIN, "localhost", "127.0.0.1"];





export const BCRYPT_ROUNDS  = 12;


export const TOKEN_EXPIRY   = "7d";


export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;











export const PAGINATION_DEFAULT = 50;


export const PAGINATION_MAX    = 200;





export const ALLOWED_MIME  = ["image/png", "image/jpeg", "image/gif", "image/webp"];


export const MAX_FILE_SIZE = 5 * 1024 * 1024;


export const BODY_LIMIT    = 6 * 1024 * 1024;


export const MIME_TO_EXT: Record<string, string> = {
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/gif":  ".gif",
	"image/webp": ".webp",
};





export const RATE_LIMIT_AUTH   = { max: 20,  timeWindow: "1 minute" as const };


export const RATE_LIMIT_GLOBAL = { max: 600, timeWindow: "1 minute" as const };




// sanitize — strip HTML tags and trim whitespace
export function sanitize(raw: string): string {
	return raw
		.replace(/<[^>]*>/g, "")
		.trim();
}
