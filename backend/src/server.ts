// ---- backend server entry point ----

import fs from "fs";
import { createApp, shutdown } from "./app.ts";
import { prisma } from "./constants.ts";
import { CardRarity, CardType } from "@prisma/client";
import { setupRealTime } from "./realtime.ts";




// PORT — server bind configuration
const PORT = 3000;


// ---- HTTPS / SSL configuration ----

const keyPath  = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

// !keyPath || !certPath → SSL config missing, fatal
if (!keyPath || !certPath) {
	throw new Error("FATAL: SSL_KEY_PATH and SSL_CERT_PATH are required");
}

// readFileSync — load TLS certificate and key from disk
const httpsOpts = {
	key:  fs.readFileSync(keyPath),
	cert: fs.readFileSync(certPath),
};


// ---- create app ----

// createApp — assemble and configure the Fastify application with HTTPS
const app = await createApp(httpsOpts);
// setupRealTime — configure real-time communication (WebSocket) for the app
setupRealTime(app);

// ---- seed placeholder cards ----

// seed placeholder cards on first start if table is empty
const count = await prisma.card.count();
if (count === 0) {
	const DEFAULTS = [
		{ name: "pikachu",   pokemon: "Pikachu",   rarity: CardRarity.Common,    type: CardType.Electric, health: 60,  image: "/resource/carte.png" },
		{ name: "charizard", pokemon: "Charizard", rarity: CardRarity.Rare,      type: CardType.Fire,     health: 150, image: "/resource/carte.png" },
		{ name: "mewtwo",    pokemon: "Mewtwo",    rarity: CardRarity.Legendary, type: CardType.Psychic,  health: 200, image: "/resource/carte.png" },
		{ name: "eevee",     pokemon: "Eevee",     rarity: CardRarity.Common,    type: CardType.Normal,   health: 50,  image: "/resource/carte.png" },
		{ name: "gengar",    pokemon: "Gengar",    rarity: CardRarity.Uncommon,  type: CardType.Ghost,    health: 80,  image: "/resource/carte.png" },
	];
	for (const c of DEFAULTS) {
		await prisma.card.create({ data: c });
	}
	console.log(`Seeded ${DEFAULTS.length} placeholder cards`);
}


// ---- listen ----

// listen — start Fastify HTTPS server on all interfaces
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Backend -> https://0.0.0.0:${PORT}`);





// shutdown — gracefully close server and database connections
process.on("SIGTERM", () => shutdown(app, "SIGTERM"));
process.on("SIGINT",  () => shutdown(app, "SIGINT"));
