import type { FastifyInstance } from "fastify";


import type { Prisma } from "@prisma/client";


import { requireAuth, wrapHandler } from "../middleware.ts";

import { prisma, PAGINATION_DEFAULT, PAGINATION_MAX, MESSAGE_MAX} from "../constants.ts";

import { lookupUser } from "./users.ts";

import { loadUsershipUser, findUsershipRow } from "./friends.ts";

import { UsershipStatus } from "@prisma/client";

// loadMessageUser - load user id + messageIds for chat operations
async function loadMessageUser(
where: Prisma.UserWhereUniqueInput,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ id: number; username: string; messageIds: number[]; usershipIds: number[] }> {
	const user = await tx.user.findUnique({
		where,
		select: { id: true, username: true, messageIds: true, usershipIds: true,},
	});
	// if user is not found, throw an error
	if (!user) { throw new Error("error.userNotFound");}
	return user;
}

// checkAreFriends - Verify that boths ussers are friends before accessing chat
async function checkAreFriends(username: string, friendUsername: string){
	const friend = await lookupUser(friendUsername);
	const me = await loadUsershipUser({ username });
	const row = await findUsershipRow(me, friend.id, UsershipStatus.Friend);
	// if no row is found, means they're not friends so we throw an error
	if (!row) {throw new Error("error.notFriends");}
	return friend;
}

// getCOnversation - Fetch all shared messages between two friends
async function getConversation(username: string, friendUsername: string, limit?: number, offset?: number,){
	const friend = await checkAreFriends(username, friendUsername);
	const me = await loadMessageUser({ username });
	const friendData = await loadMessageUser({ id: friend.id });
	const sharedMessageIds = me.messageIds.filter(id => friendData.messageIds.includes(id));
	// if no shared messages, return empty array
	if (!sharedMessageIds.length) {
		return [];
	}
	const message = await prisma.message.findMany({
		where: { id: { in: sharedMessageIds } },
		orderBy: { time: "asc" },
		take: limit,
		skip: offset,
	});

	return message.map(message => ({
	...message,
	username: message.userId === me.id
		? me.username
		: friendData.username,
}));
}

// createMessage - Create a new message and attach it to both user
async function createMessage(username: string, friendUsername: string, content: string) {
	if (content.length > MESSAGE_MAX) { throw new Error("error.messageTooLong");}
	// validate content is not empty
	if (!content || !content.trim()) { throw new Error("error.emptyMessage");}
	const friend = await checkAreFriends(username, friendUsername);
	// create a new message and attach it to both users in a transaction
	return prisma.$transaction(async (tx) => {
		const me = await loadMessageUser({ username }, tx);
		const friendData = await loadMessageUser({ id: friend.id }, tx);
		
		const message = await tx.message.create({
			data: {
				userId: me.id,
				content: content.trim(),
			},
		});
		// update both users to include the new message id
		await tx.user.update({
			where: { id: me.id },
			data: { messageIds: { push: message.id } },
		});
		await tx.user.update({
			where: { id: friendData.id },
			data: { messageIds: { push: message.id } },
		});
		return {
			...message, username: me.username,
		};
	});
}


// messageRoutes - register all chat endpoint with auth prehandler
async function messagesRoutes(app: FastifyInstance) {
	app.addHook("preHandler", requireAuth);// all routes require auth
	app.get("/:username", wrapHandler(async (request) => {// get all messages between the logged in user and the friend
		const { username } = request.params as { username: string };
		const { limit, offset } = request.query as { limit?: string; offset?: string };

		const l = Math.min(Number(limit) || PAGINATION_DEFAULT, PAGINATION_MAX);
		const o = Number(offset) || 0;

		return await getConversation(request.user.username, username, l, o);
	}));
	app.post("/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		const body = request.body as { content?: string };

		return await createMessage(request.user.username, username, body.content || "");
	}));

}

export default messagesRoutes;


