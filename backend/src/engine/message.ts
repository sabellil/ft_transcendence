import type { FastifyInstance } from "fastify";


import type { Prisma } from "@prisma/client";


import { requireAuth, wrapHandler } from "../middleware.ts";

import { prisma, PAGINATION_DEFAULT, PAGINATION_MAX } from "../constants.ts";

import { lookupUser } from "./users.ts";

import { loadUsershipUser, findUsershipRow } from "./friends.ts";

import { UsershipStatus } from "@prisma/client";


async function loadMessageUser{

}

async function checkAreFriends{

}

async function getConversation{

}

async function createMessage{

}

async function messagesRoutes{

}



export default messagesRoutes;









// lookupCard — resolve card name to full card record (throws if not found)
export async function lookupCard(cardName: string) {
	// findUnique — fetch card by name
	const card = await prisma.card.findUnique({ where: { name: cardName } });
	// !card → card not found
	if (!card) {
		throw new Error("error.cardNotFound");
	}
	return card;
}





// createCard — create a new card (admin only)
async function createCard(data: Prisma.CardCreateInput) {
	// findUnique — check if card name is already taken
	const existing = await prisma.card.findUnique({ where: { name: data.name } });
	// existing → name conflict
	if (existing) {
		throw new Error("error.cardNameTaken");
	}
	// create — insert new card into database
	await prisma.card.create({ data });
	return { success: true };
}





// getCardList — fetch all cards with pagination
async function getCardList(limit?: number, offset?: number) {
	// findMany — fetch cards sorted by id
	return prisma.card.findMany({ orderBy: { id: "asc" }, take: limit, skip: offset });
}





// getCard — fetch single card by name
async function getCard(cardName: string) {
	// findUnique — fetch card by name
	return prisma.card.findUnique({ where: { name: cardName } });
}





// editCard — update card fields and/or image (admin only)
async function editCard(
	cardName: string,
	opts: {
		name?:    string;
		pokemon?: string;
		rarity?:  Prisma.CardCreateInput["rarity"];
		type?:    Prisma.CardCreateInput["type"];
		subType?: Prisma.CardCreateInput["subType"];
		health?:  number;
		filename?: string;
		buffer?:   Buffer;
		mimetype?: string;
	},
) {
	// lookupCard — find card by current name
	const card = await lookupCard(cardName);
	const updates: Prisma.CardUpdateInput = {};

	// opts.name → rename check for conflicts
	if (opts.name) {
		// findUnique — check if new name is taken
		const conflict = await prisma.card.findUnique({ where: { name: opts.name } });
		// conflict && conflict.id !== card.id → name taken by another card
		if (conflict && conflict.id !== card.id) {
			throw new Error("error.cardNameTaken");
		}
		updates.name = opts.name;
	}

	if (opts.pokemon !== undefined) updates.pokemon = opts.pokemon;
	if (opts.rarity  !== undefined) updates.rarity  = opts.rarity;
	if (opts.type    !== undefined) updates.type    = opts.type;
	if (opts.subType !== undefined) updates.subType = opts.subType;
	if (opts.health  !== undefined) updates.health  = opts.health;

	// opts.filename && opts.buffer → upload new card image
	if (opts.filename && opts.buffer) {
		// saveUploadedFile — persist image to disk
		updates.image = await saveUploadedFile(
			"uploads/cards",
			opts.mimetype || "",
			opts.buffer,
			card.image || undefined,
		);
	}

	// no updates → return current card unchanged
	if (Object.keys(updates).length === 0) {
		return card;
	}

	// update — apply field changes to database
	await prisma.card.update({ where: { id: card.id }, data: updates });

	// getCard — fetch updated card to return
	const updated = await getCard(opts.name ?? cardName);
	// !updated → card vanished after update
	if (!updated) throw new Error("error.cardNotFound");
	return updated;
}





// deleteCard — remove card from database and clean up image file (admin only)
async function deleteCard(cardName: string) {
	// lookupCard — find card by name
	const card = await lookupCard(cardName);
	// delete — remove card from database
	await prisma.card.delete({ where: { id: card.id } });

	// card.image → delete image file from disk
	if (card.image) {
		await fs.promises.unlink("." + card.image).catch(() => {});
	}
	return { success: true };
}





// cardsRoutes — register card CRUD endpoints on Fastify instance
async function cardsRoutes(app: FastifyInstance) {

	app.post("/", { preHandler: [requireAuth, requireAdmin] }, wrapHandler(async (request, reply) => {
		// validateBody — parse card creation data
		const data = validateBody(createCardSchema, request.body, reply);
		// !data → validation failed
		if (!data) return;
		// createCard — insert new card
		return await createCard(data);
	}));

	app.get("/", wrapHandler(async (request) => {
		const { limit, offset } = request.query as { limit?: string; offset?: string };
		const l = Math.min(Number(limit) || PAGINATION_DEFAULT, PAGINATION_MAX);
		const o = Number(offset) || 0;
		// getCardList — fetch paginated cards
		return await getCardList(l, o);
	}));

	app.get("/:name", wrapHandler(async (request, reply) => {
		const { name: cardName } = request.params as { name: string };
		// getCard — fetch single card
		const card = await getCard(cardName);
		// !card → card not found
		if (!card) return reply.status(404).send({ error: "error.cardNotFound" });
		return card;
	}));

	app.post("/:name", { preHandler: [requireAuth, requireAdmin] }, wrapHandler(async (request, reply) => {
		const { name: cardName } = request.params as { name: string };

		// isMultipart → handle file upload
		if (request.isMultipart()) {
			// validateMultipart — extract and validate uploaded file
			const result = await validateMultipart(request, reply);
			// !result → validation failed
			if (!result) return;

			const { file, buffer, fields } = result;
			// validateBody — parse optional card edit fields
			const data = validateBody(editCardSchema, {
				name:    fields.name?.value,
				pokemon: fields.pokemon?.value,
				rarity:  fields.rarity?.value,
				type:    fields.type?.value,
				subType: fields.subType?.value,
				health:  fields.health?.value,
			}, reply);
			// !data → validation failed
			if (!data) return;
			// editCard — update card with image
			return await editCard(cardName, {
				filename: file.filename,
				mimetype: file.mimetype,
				buffer,
				...data,
			});
		}

		// validateBody — parse JSON edit data
		const data = validateBody(editCardSchema, request.body, reply);
		// !data → validation failed
		if (!data) return;
		// editCard — update card without image
		return await editCard(cardName, data);
	}));

	app.post("/:name/remove", { preHandler: [requireAuth, requireAdmin] }, wrapHandler(async (request) => {
		const { name: cardName } = request.params as { name: string };
		// deleteCard — remove card from database
		return await deleteCard(cardName);
	}));
}










export default cardsRoutes;
