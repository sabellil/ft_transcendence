import { defineConfig } from "prisma/config";




// Prisma Configuration
export default defineConfig({
	schema: "schema.prisma",
	migrations: {
		path: "migrations",
	},
	datasource: {
		url: process.env["DATABASE_URL"],
	},
});
