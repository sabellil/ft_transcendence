// Friendship System Rules:
//
// 1. Friend Request Initiation — User A sends request to User B:
//    → User A: userId=B, status=Pending   |   User B: userId=A, status=Requested
// 2. Friend Request Acceptance — User B accepts User A's request:
//    → both rows flip to status=Friend (missing reciprocal row is created)
// 3. Cancel Outgoing — User A cancels their sent request:
//    → A's row deleted if status=Pending, else kept
//    → B's row deleted if status=Requested, else kept
// 4. Decline Incoming — User B declines an incoming request:
//    → B's row deleted if status=Requested, else kept
//    → A's row deleted if status=Pending, else kept
// 5. Block Initiation — User A blocks User B:
//    → User A: userId=B, status=Blocked (one-directional)
// 6. Block Prevents Incoming — blocked user tries to send request:
//    → blocked user's row deleted, block persists
// 7. Block Prevents Outgoing — blocker tries to send request to blocked:
//    → request not created, block persists
// 8. Block Overwrites Friendship — block while friends:
//    → User A: status→Blocked, User B's Friend row deleted
// 9. Bidirectional Request — B requests A while A already requested B:
//    → A's existing Pending flips to Requested (both sides now Requested)
//    → either user can accept, which flips ALL rows to Friend


import type { FastifyInstance } from "fastify";


import type { Prisma } from "@prisma/client";


import { UsershipStatus } from "@prisma/client";


import { requireAuth, wrapHandler } from "../middleware.ts";


import { prisma, PAGINATION_DEFAULT, PAGINATION_MAX } from "../constants.ts";


import { lookupUser } from "./users.ts";





// loadUsershipUser — load user id + usershipIds for relationship checks
export async function loadUsershipUser(
	where: Prisma.UserWhereUniqueInput,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ id: number; usershipIds: number[] }> {
	// findUnique — resolve user with usership IDs
	const user = await tx.user.findUnique({ where, select: { id: true, usershipIds: true } });
	// !user → reject [Rule 1-8]
	if (!user) {
		throw new Error("error.userNotFound");
	}
	return user;
}





// findUsershipRow — find a specific relationship row between two users
export async function findUsershipRow(
	owner: { usershipIds: number[] },
	peerId: number,
	status?: UsershipStatus,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
	// !usershipIds.length → no rows, skip [Rule 1-8]
	if (!owner.usershipIds.length) return null;

	// findFirst — check if relationship already exists
	return tx.usership.findFirst({
		where: {
			id: { in: owner.usershipIds },
			userId: peerId,
			...(status !== undefined ? { status } : {}),
		},
	});
}





// removeFriendFromIds — clean bidirectional Friend rows when blocking
export async function removeFriendFromIds(tx: Prisma.TransactionClient, a: number, b: number) {
	// findUnique — load user A record
	const userA = await tx.user.findUnique({ where: { id: a } });
	// findUnique — load user B record
	const userB = await tx.user.findUnique({ where: { id: b } });

	// peer deleted mid-operation → skip [Rule 8]
	if (!userA || !userB) {
		return;
	}

	// findMany — fetch Friend rows between both users
	const rows = await tx.usership.findMany({
		where: {
			id: { in: [...userA.usershipIds, ...userB.usershipIds] },
			status: UsershipStatus.Friend,
		},
	});

	const aRow = rows.find(r => r.userId === b);
	const bRow = rows.find(r => r.userId === a);

	// aRow → remove from A side [Rule 8]
	if (aRow) {
		// update — remove row from usershipIds array
		await tx.user.update({
			where: { id: a },
			data:  { usershipIds: userA.usershipIds.filter(id => id !== aRow.id) },
		});
	}
	// bRow → remove from B side [Rule 8]
	if (bRow) {
		// update — remove row from usershipIds array
		await tx.user.update({
			where: { id: b },
			data:  { usershipIds: userB.usershipIds.filter(id => id !== bRow.id) },
		});
	}

	const idsToDelete: number[] = [];
	// aRow → queue for deletion [Rule 8]
	if (aRow) idsToDelete.push(aRow.id);
	// bRow → queue for deletion [Rule 8]
	if (bRow) idsToDelete.push(bRow.id);

	// idsToDelete → delete both Friend rows [Rule 8]
	if (idsToDelete.length) {
		// deleteMany — remove Friend usership rows
		await tx.usership.deleteMany({ where: { id: { in: idsToDelete } } });
	}
}





// getFriendList — fetch profiles of friends with pagination
async function getFriendList(username: string, limit?: number, offset?: number) {
	// loadUsershipUser — get user's usership IDs
	const me = await loadUsershipUser({ username });

	// findMany — fetch all Friend usership rows
	const rows = await prisma.usership.findMany({
		where: { id: { in: me.usershipIds }, status: UsershipStatus.Friend },
	});
	// !rows.length → no friends, empty list
	if (!rows.length) {
		return [];
	}

	// findMany — fetch friend user profiles
	return prisma.user.findMany({
		where:  { id: { in: rows.map(r => r.userId) } },
		select: { username: true, avatar: true, status: true },
		take: limit,
		skip: offset,
	});
}





// getFriend — single friend profile by username
async function getFriend(username: string, friendUsername: string) {
	// loadUsershipUser — get user's usership IDs
	const me = await loadUsershipUser({ username });

	let friend;

	// try lookupUser — resolve friend username
	try {
		friend = await lookupUser(friendUsername);
	// catch user not found → return null
	} catch {
		return null;
	}

	// findUsershipRow — check if Friend relationship exists
	const row = await findUsershipRow(me, friend.id, UsershipStatus.Friend);
	// !row → not friends, return null
	if (!row) {
		return null;
	}

	// findUnique — fetch friend profile
	return prisma.user.findUnique({
		where:  { id: friend.id },
		select: { username: true, avatar: true, status: true },
	});
}





// createFriendRequest — send request: creates bidirectional Pending+Requested rows
async function createFriendRequest(username: string, receiverUsername: string) {
	// username === receiverUsername → self-request, reject [Rule 1]
	if (username === receiverUsername) {
		throw new Error("error.cannotAddSelf");
	}

	// lookupUser — resolve receiver username
	const receiver = await lookupUser(receiverUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// loadUsershipUser — load sender's usership data
		const sender = await loadUsershipUser({ username }, tx);

		// findUsershipRow — check existing relationship from sender to receiver [Rule 4/5/7]
		const senderExisting = await findUsershipRow(sender, receiver.id, undefined, tx);
		// senderExisting → check relationship status
		if (senderExisting) {
			// Blocked → reject [Rule 7]
			if (senderExisting.status === UsershipStatus.Blocked) {
				throw new Error("error.cannotSendBlocked");
			}
			// Friend → reject duplicate [Rule 4]
			if (senderExisting.status === UsershipStatus.Friend) {
				throw new Error("error.alreadyFriends");
			}
			// Pending → already sent request, reject duplicate [Rule 4]
			if (senderExisting.status === UsershipStatus.Pending) {
				throw new Error("error.requestAlreadyExists");
			}
			// Requested → row came from receiver's request, not mine — allow through
		}

		// loadUsershipUser — load receiver's usership data
		const receiverData = await loadUsershipUser({ id: receiver.id }, tx);

		// findMany — fetch receiver's usership rows toward sender
		const receiverRows = await tx.usership.findMany({
			where: {
				id: { in: receiverData.usershipIds },
				userId: sender.id,
			},
		});

		// blockedRow → target blocked sender, silently discard request [Rule 6]
		const blockedRow = receiverRows.find(r => r.status === UsershipStatus.Blocked);
		if (blockedRow) {
			// findMany — get sender's pending rows toward receiver
			const senderPending = await tx.usership.findMany({
				where: { id: { in: sender.usershipIds }, userId: receiver.id },
			});

			const idsToDelete: number[] = [];
			for (const r of senderPending) {
				// clean non-permanent pending rows [Rule 6]
				if (r.status !== UsershipStatus.Blocked && r.status !== UsershipStatus.Friend) {
					idsToDelete.push(r.id);
				}
			}
			// idsToDelete → remove sender pending rows [Rule 6]
			if (idsToDelete.length) {
				// deleteMany — remove sender pending rows [Rule 6]
				await tx.usership.deleteMany({ where: { id: { in: idsToDelete } } });
				// update — remove deleted ids from usershipIds array
				await tx.user.update({
					where: { id: sender.id },
					data:  { usershipIds: sender.usershipIds.filter(id => !idsToDelete.includes(id)) },
				});
			}
			return { success: true };
		}

		// existingRow → check for Friend (already handled Blocked above) [Rule 4]
		const existingRow = receiverRows.find(r => r.status !== UsershipStatus.Blocked);
		if (existingRow) {
			// Friend → reject [Rule 4]
			if (existingRow.status === UsershipStatus.Friend) {
				throw new Error("error.alreadyFriends");
			}
			// Pending or Requested → bidirectional request detected [Rule 9]
			// flip receiver's Pending → Requested so both sides are Requested
			// either user can now accept
			if (existingRow.status === UsershipStatus.Pending || existingRow.status === UsershipStatus.Requested) {
				if (existingRow.status === UsershipStatus.Pending) {
					await tx.usership.update({
						where: { id: existingRow.id },
						data:  { status: UsershipStatus.Requested },
					});
				}
				return { success: true };
			}
		}

		// create — sender Pending row [Rule 1]
		const senderRow = await tx.usership.create({
			data: { userId: receiver.id, status: UsershipStatus.Pending },
		});
		// update — push sender's row to usershipIds array
		await tx.user.update({
			where: { id: sender.id },
			data:  { usershipIds: { push: senderRow.id } },
		});

		// create — receiver Requested row [Rule 1]
		const receiverRow = await tx.usership.create({
			data: { userId: sender.id, status: UsershipStatus.Requested },
		});
		// update — push receiver's row to usershipIds array
		await tx.user.update({
			where: { id: receiver.id },
			data:  { usershipIds: { push: receiverRow.id } },
		});

		return { success: true };
	});
}





// getDirectionalFriendRequests — incoming or outgoing pending requests
async function getDirectionalFriendRequests(username: string, direction: "incoming" | "outgoing") {
	// findUnique — load user's usership IDs
	const me = await prisma.user.findUnique({
		where:  { username },
		select: { usershipIds: true },
	});
	// !me || !usershipIds → no relationships, empty list
	if (!me || !me.usershipIds.length) {
		return [];
	}

	const status = direction === "outgoing"
		? UsershipStatus.Pending
		: UsershipStatus.Requested;

	// findMany — fetch usership rows by status
	const rows = await prisma.usership.findMany({
		where: { id: { in: me.usershipIds }, status },
	});
	// !rows.length → no results, empty list
	if (!rows.length) {
		return [];
	}

	// findMany — fetch user profiles for pending requests
	return prisma.user.findMany({
		where:  { id: { in: rows.map(r => r.userId) } },
		select: { username: true, avatar: true, status: true },
	});
}





// acceptFriendRequest — flip ALL Pending/Requested rows between both users to Friend
// creates missing reciprocal Friend row so both sides always end up as friends
async function acceptFriendRequest(username: string, senderUsername: string) {
	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// lookupUser — resolve sender username
		const sender = await lookupUser(senderUsername);
		// loadUsershipUser — load both users' usership data
		const accepter = await loadUsershipUser({ username }, tx);
		const senderData = await loadUsershipUser({ id: sender.id }, tx);

		// findMany — find ALL Pending/Requested rows between both users (handles legacy duplicates)
		const allRows = await tx.usership.findMany({
			where: {
				id: { in: [...accepter.usershipIds, ...senderData.usershipIds] },
				status: { in: [UsershipStatus.Pending, UsershipStatus.Requested] },
			},
		});

		// filter to rows actually between these two users
		const relevantRows = allRows.filter(
			r => (r.userId === sender.id || r.userId === accepter.id)
		);

		// !relevantRows.length → no pending relationship, reject [Rule 2]
		if (!relevantRows.length) {
			throw new Error("error.noPendingFromUser");
		}

		// flip ALL relevant rows to Friend in one update
		await tx.usership.updateMany({
			where: { id: { in: relevantRows.map(r => r.id) } },
			data:  { status: UsershipStatus.Friend },
		});

		// ensure both users have a Friend row (create missing reciprocal) [Rule 2]
		const accepterHasRow = relevantRows.some(r => accepter.usershipIds.includes(r.id));
		const senderHasRow = relevantRows.some(r => senderData.usershipIds.includes(r.id));

		// before creating, check they don't already have a Friend row (prevents duplicates
		// in case of legacy data where Friend + Pending rows coexist)
		if (!accepterHasRow && !(await findUsershipRow(accepter, sender.id, UsershipStatus.Friend, tx))) {
			const newRow = await tx.usership.create({
				data: { userId: sender.id, status: UsershipStatus.Friend },
			});
			await tx.user.update({
				where: { id: accepter.id },
				data:  { usershipIds: { push: newRow.id } },
			});
		}

		if (!senderHasRow && !(await findUsershipRow(senderData, accepter.id, UsershipStatus.Friend, tx))) {
			const newRow = await tx.usership.create({
				data: { userId: accepter.id, status: UsershipStatus.Friend },
			});
			await tx.user.update({
				where: { id: sender.id },
				data:  { usershipIds: { push: newRow.id } },
			});
		}

		return { success: true };
	});
}





// removeFriendRequest — cancel/decline: delete matching rows per direction rules
async function removeFriendRequest(username: string, targetUsername: string, direction: "incoming" | "outgoing") {
	const isIncoming = direction === "incoming";

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// lookupUser — resolve target username
		const target = await lookupUser(targetUsername);
		// loadUsershipUser — load both users' usership data
		const me = await loadUsershipUser({ username }, tx);
		const targetData = await loadUsershipUser({ id: target.id }, tx);

		// expected status for my row and their row based on direction
		const myStatus = isIncoming ? UsershipStatus.Requested : UsershipStatus.Pending;
		const theirStatus = isIncoming ? UsershipStatus.Pending : UsershipStatus.Requested;

		// findUsershipRow — find my row (any status, not just expected)
		const myRow = await findUsershipRow(me, target.id, undefined, tx);
		// findUsershipRow — find their row (any status, not just expected)
		const theirRow = await findUsershipRow(targetData, me.id, undefined, tx);

		// match against expected status — delete only if status matches
		const myRowMatches = myRow !== null && myRow.status === myStatus;
		const theirRowMatches = theirRow !== null && theirRow.status === theirStatus;

		// neither row matches expected status → nothing to cancel/decline
		if (!myRowMatches && !theirRowMatches) {
			throw new Error(isIncoming ? "error.noPendingFromUser" : "error.noPendingToUser");
		}

		// build delete list from matching rows only [Rule 3/4]
		const idsToDelete: number[] = [];
		if (myRowMatches) idsToDelete.push(myRow!.id);
		if (theirRowMatches) idsToDelete.push(theirRow!.id);

		// deleteMany — delete matched rows
		if (idsToDelete.length) {
			await tx.usership.deleteMany({ where: { id: { in: idsToDelete } } });
		}

		// update — remove my matched row from usershipIds array
		if (myRowMatches) {
			await tx.user.update({
				where: { id: me.id },
				data:  { usershipIds: me.usershipIds.filter(id => id !== myRow!.id) },
			});
		}

		// update — remove their matched row from usershipIds array
		if (theirRowMatches) {
			await tx.user.update({
				where: { id: target.id },
				data:  { usershipIds: targetData.usershipIds.filter(id => id !== theirRow!.id) },
			});
		}

		return { success: true };
	});
}





// deleteUsership — unfriend: remove Friend link from both sides
async function deleteUsership(username: string, friendUsername: string) {
	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// lookupUser — resolve friend username
		const friend = await lookupUser(friendUsername);
		// loadUsershipUser — load my usership data
		const me = await loadUsershipUser({ username }, tx);
		// loadUsershipUser — load friend's usership data
		const friendData = await loadUsershipUser({ id: friend.id }, tx);

		// findUsershipRow — find my Friend row
		const myRow = await findUsershipRow(me, friend.id, UsershipStatus.Friend, tx);
		// findUsershipRow — find their Friend row
		const theirRow = await findUsershipRow(friendData, me.id, UsershipStatus.Friend, tx);

		// !myRow → not friends, reject
		if (!myRow) {
			throw new Error("error.notFriends");
		}

		const idsToDelete = [myRow.id];
		// theirRow → peer has matching row, delete both
		if (theirRow) {
			idsToDelete.push(theirRow.id);
		}
		// deleteMany — delete both Friend rows
		await tx.usership.deleteMany({ where: { id: { in: idsToDelete } } });
		// update — remove my row from usershipIds array
		await tx.user.update({
			where: { id: me.id },
			data:  { usershipIds: me.usershipIds.filter(id => id !== myRow.id) },
		});

		// theirRow → remove their old row from array
		if (theirRow) {
			// update — remove their row from usershipIds array
			await tx.user.update({
				where: { id: friend.id },
				data:  { usershipIds: friendData.usershipIds.filter(id => id !== theirRow.id) },
			});
		}

		return { success: true };
	});
}





// friendsRoutes — register all friend endpoints with auth preHandler
async function friendsRoutes(app: FastifyInstance) {
	app.addHook("preHandler", requireAuth);

	app.get("/", wrapHandler(async (request) => {
		const { limit, offset } = request.query as { limit?: string; offset?: string };
		const l = Math.min(Number(limit) || PAGINATION_DEFAULT, PAGINATION_MAX);
		const o = Number(offset) || 0;
		// getFriendList — fetch paginated friend list
		return await getFriendList(request.user.username, l, o);
	}));

	app.get("/:username", wrapHandler(async (request, reply) => {
		const { username } = request.params as { username: string };
		// getFriend — fetch single friend profile
		const profile = await getFriend(request.user.username, username);
		// !profile → not friends, return 404
		if (!profile) {
			return reply.status(404).send({ error: "error.notFriends" });
		}
		return profile;
	}));

	app.post("/request/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		// createFriendRequest — send friend request
		return await createFriendRequest(request.user.username, username);
	}));

	app.post("/pending/:direction/:username", wrapHandler(async (request) => {
		const { direction, username } = request.params as { direction: "incoming" | "outgoing"; username: string };
		// removeFriendRequest — decline/cancel pending request
		return await removeFriendRequest(request.user.username, username, direction);
	}));

	app.get("/pending/:direction", wrapHandler(async (request) => {
		const { direction } = request.params as { direction: "incoming" | "outgoing" };
		// getDirectionalFriendRequests — fetch pending requests
		return await getDirectionalFriendRequests(request.user.username, direction);
	}));

	app.post("/accept/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		// acceptFriendRequest — accept incoming friend request
		return await acceptFriendRequest(request.user.username, username);
	}));

	app.post("/remove/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		// deleteUsership — unfriend a user
		return await deleteUsership(request.user.username, username);
	}));
}





// createBlock — block user: one-directional, cleans prior relationship
async function createBlock(username: string, targetUsername: string) {
	// username === targetUsername → self-block, reject [Rule 5]
	if (username === targetUsername) throw new Error("error.cannotBlockSelf");

	// lookupUser — resolve target username
	const target = await lookupUser(targetUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// loadUsershipUser — load blocker's usership data
		const blocker = await loadUsershipUser({ username }, tx);
		// loadUsershipUser — load target's usership data
		const targetData = await loadUsershipUser({ id: target.id }, tx);

		// findMany — fetch all relevant usership rows between both users
		const allRows = await tx.usership.findMany({
			where: { id: { in: [...blocker.usershipIds, ...targetData.usershipIds] } },
		});

		const myRow = allRows.find(r => r.userId === target.id);
		const theirRow = allRows.find(r => r.userId === blocker.id);

		// myRow && status === Blocked → already blocked, nothing to do [Rule 5]
		if (myRow && myRow.status === UsershipStatus.Blocked) throw new Error("error.alreadyBlocked");

		// were friends → clean Friend rows first [Rule 8]
		if (myRow?.status === UsershipStatus.Friend || theirRow?.status === UsershipStatus.Friend) {
			// removeFriendFromIds — clean bidirectional Friend rows
			await removeFriendFromIds(tx, blocker.id, target.id);
			// re-read after Friend cleanup to avoid stale usership arrays
			const freshBlocker = await tx.user.findUnique({ where: { id: blocker.id }, select: { usershipIds: true } });
			const freshTarget  = await tx.user.findUnique({ where: { id: target.id },  select: { usershipIds: true } });
			if (freshBlocker) blocker.usershipIds = freshBlocker.usershipIds;
			if (freshTarget)  targetData.usershipIds = freshTarget.usershipIds;
		}

		// clean non-permanent rows between blocker and target [Rule 5/8]
		const idsToClean: number[] = [];
		// myRow non-permanent → clean blocker side [Rule 5/8]
		if (myRow && myRow.status !== UsershipStatus.Blocked && myRow.status !== UsershipStatus.Friend) {
			idsToClean.push(myRow.id);
		}
		// theirRow non-permanent → clean target side [Rule 5/8]
		if (theirRow && theirRow.status !== UsershipStatus.Blocked && theirRow.status !== UsershipStatus.Friend) {
			idsToClean.push(theirRow.id);
		}
		// idsToClean → delete cleaned rows [Rule 5/8]
		if (idsToClean.length) await tx.usership.deleteMany({ where: { id: { in: idsToClean } } });

		// myRow → remove cleaned row from blocker side [Rule 5]
		if (myRow) await tx.user.update({ where: { id: blocker.id }, data: { usershipIds: blocker.usershipIds.filter(id => id !== myRow.id) } });
		// theirRow → remove cleaned row from target side [Rule 5]
		if (theirRow) await tx.user.update({ where: { id: target.id }, data: { usershipIds: targetData.usershipIds.filter(id => id !== theirRow.id) } });

		// create — block row [Rule 5]
		const blockRow = await tx.usership.create({ data: { userId: target.id, status: UsershipStatus.Blocked } });
		// update — push block row to usershipIds array
		await tx.user.update({ where: { id: blocker.id }, data: { usershipIds: { push: blockRow.id } } });

		return { success: true };
	});
}





// deleteBlock — unblock: remove Blocked row
async function deleteBlock(username: string, targetUsername: string) {
	// lookupUser — resolve target username
	const target = await lookupUser(targetUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// loadUsershipUser — load blocker's usership data
		const blocker = await loadUsershipUser({ username }, tx);
		// findUsershipRow — find the Blocked row
		const row = await findUsershipRow(blocker, target.id, UsershipStatus.Blocked, tx);
		// !row → not blocked, reject [Rule 5]
		if (!row) throw new Error("error.notBlocked");

		// update — remove row from usershipIds array
		await tx.user.update({ where: { id: blocker.id }, data: { usershipIds: blocker.usershipIds.filter(id => id !== row.id) } });
		// delete — delete block row
		await tx.usership.delete({ where: { id: row.id } });

		return { success: true };
	});
}





// getBlockList — fetch blocked user profiles with pagination
async function getBlockList(username: string, limit?: number, offset?: number) {
	// loadUsershipUser — load user's usership data
	const me = await loadUsershipUser({ username });
	// !usershipIds.length → no rows, empty list
	if (!me.usershipIds.length) return [];

	// findMany — fetch Blocked usership rows
	const rows = await prisma.usership.findMany({ where: { id: { in: me.usershipIds }, status: UsershipStatus.Blocked } });
	// !rows.length → no results, empty list
	if (!rows.length) return [];

	// findMany — fetch blocked user profiles
	return prisma.user.findMany({ where: { id: { in: rows.map(r => r.userId) } }, select: { username: true, avatar: true, status: true }, take: limit, skip: offset });
}





// blocksRoutes — register all block endpoints with auth preHandler
async function blocksRoutes(app: FastifyInstance) {
	app.addHook("preHandler", requireAuth);

	app.post("/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		// createBlock — block a user
		return await createBlock(request.user.username, username);
	}));

	app.post("/remove/:username", wrapHandler(async (request) => {
		const { username } = request.params as { username: string };
		// deleteBlock — unblock a user
		return await deleteBlock(request.user.username, username);
	}));

	app.get("/", wrapHandler(async (request) => {
		const { limit, offset } = request.query as { limit?: string; offset?: string };
		// getBlockList — fetch paginated block list
		return await getBlockList(request.user.username, Math.min(Number(limit) || PAGINATION_DEFAULT, PAGINATION_MAX), Number(offset) || 0);
	}));
}










export default friendsRoutes;


export { blocksRoutes };
