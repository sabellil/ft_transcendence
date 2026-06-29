// Guild System Rules:
//
// 1. User Join Request — user requests to join guild:
//    → guildship: userId=user, status=UserRequest → push id to guild.guildshipIds
// 2. Owner Guild Invite — owner invites user:
//    → guildship: userId=user, status=OwnerRequest → push id to guild.guildshipIds
// 3. Accept User Join Request — owner accepts UserRequest:
//    → guildship status → User
// 4. Decline User Join Request — owner declines UserRequest:
//    → delete guildship, remove id from guild.guildshipIds
// 5. Accept Owner Invite — user accepts OwnerRequest:
//    → guildship status → User
// 6. Decline Owner Invite — user declines OwnerRequest:
//    → delete guildship, remove id from guild.guildshipIds
// 7. Remove Guild Member — owner or self removes member:
//    → delete guildship, remove id from guild.guildshipIds
// 8. Owner Promote User — any owner promotes User:
//    → guildship status → Owner
// 9. Owner Demote Owner — any owner demotes another owner:
//    → guildship status → User (last owner protected)


import fs from "fs";


import type { FastifyInstance } from "fastify";


import type { Prisma } from "@prisma/client";


import { GuildshipStatus, UsershipStatus, UserStatus } from "@prisma/client";


import { requireAuth, wrapHandler, validateMultipart, saveUploadedFile, validateBody } from "../middleware.ts";


import { createGuildSchema, editGuildSchema } from "../validation.ts";


import { prisma, PAGINATION_DEFAULT, PAGINATION_MAX } from "../constants.ts";


import { lookupUser } from "./users.ts";


import { findUsershipRow, loadUsershipUser } from "./friends.ts";





// lookupGuild — guildName → full Guild record (throws if not found)
export async function lookupGuild(guildName: string) {
	// findUnique — resolve guild name to guild record
	const guild = await prisma.guild.findUnique({ where: { name: guildName } });
	// !guild → guild not found, reject
	if (!guild) {
		throw new Error("error.guildNotFound");
	}
	return guild;
}





// findOwnerRow — guild, userId, tx? → Owner guildship row | null
async function findOwnerRow(
	guild: { guildshipIds: number[] },
	userId: number,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
	// !guildshipIds.length → no rows, skip
	if (!guild.guildshipIds.length) return null;
	// findFirst — check if user is an owner in this guild
	return tx.guildship.findFirst({
		where: {
			id: { in: guild.guildshipIds },
			userId,
			status: GuildshipStatus.Owner,
		},
	});
}





// findGuildshipRow — guild, userId, tx? → guildship row | null
async function findGuildshipRow(
	guild: { guildshipIds: number[] },
	userId: number,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
	// !guildshipIds.length → no rows, skip
	if (!guild.guildshipIds.length) return null;
	// findFirst — check if relationship exists between user and guild
	return tx.guildship.findFirst({
		where: {
			id: { in: guild.guildshipIds },
			userId,
		},
	});
}





// findPendingGuildshipRow — guild, userId, tx? → pending guildship row | null
async function findPendingGuildshipRow(
	guild: { guildshipIds: number[] },
	userId: number,
	tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
	// !guildshipIds.length → no rows, skip
	if (!guild.guildshipIds.length) return null;
	// findFirst — check for pending request (not yet accepted or declined)
	return tx.guildship.findFirst({
		where: {
			id: { in: guild.guildshipIds },
			userId,
			status: { notIn: [GuildshipStatus.Owner, GuildshipStatus.User] },
		},
	});
}





// isGuildOwner — guildName, userId, tx? → boolean
async function isGuildOwner(
	guildName: string,
	userId: number,
	tx?: Prisma.TransactionClient,
): Promise<boolean> {
	// lookupGuild — resolve guild record
	const guild = await lookupGuild(guildName);
	// findOwnerRow — check if user is owner
	const row = await findOwnerRow(guild, userId, tx);
	return !!row;
}





// requireNotLastOwner — tx, guild, myGuildshipId → void (throws LAST_OWNER)
async function requireNotLastOwner(
	tx: Prisma.TransactionClient,
	guild: { guildshipIds: number[] },
	myGuildshipId: number,
): Promise<void> {
	const otherIds = guild.guildshipIds.filter((id: number) => id !== myGuildshipId);
	const otherOwner = otherIds.length
		? await tx.guildship.findFirst({
			where: { id: { in: otherIds }, status: GuildshipStatus.Owner },
		})
		: null;

	// !otherOwner → last owner cannot be removed, reject [Rule 7/9]
	if (!otherOwner) {
		throw new Error("error.lastOwner");
	}
}





// removeGuildshipFromGuild — tx, guild, row → void
async function removeGuildshipFromGuild(
	tx: Prisma.TransactionClient,
	guild: { id: number; guildshipIds: number[] },
	row: { id: number; userId: number },
): Promise<void> {
	// update — remove guildship id from guild array [Rule 4/6/7]
	await tx.guild.update({
		where: { id: guild.id },
		data:  { guildshipIds: guild.guildshipIds.filter((id: number) => id !== row.id) },
	});
	// delete — remove guildship row [Rule 4/6/7]
	await tx.guildship.delete({ where: { id: row.id } });
}







// createGuild — guildName, username → { success: true }
async function createGuild(guildName: string, username: string) {
	// findUnique — resolve username to user record
	const owner = await prisma.user.findUnique({ where: { username } });
	// !owner → user not found
	if (!owner) {
		throw new Error("error.ownerNotFound");
	}

	// $transaction — prevent race conditions: all queries succeed or none
	await prisma.$transaction(async (tx) => {
		// findUnique — check if guild name already taken
		const existing = await tx.guild.findUnique({ where: { name: guildName } });
		// existing → guild name taken, reject
		if (existing) {
			throw new Error("error.guildNameTaken");
		}
		// create — create guild row
		const guild = await tx.guild.create({ data: { name: guildName } });
		// create — create owner guildship row
		const guildship = await tx.guildship.create({
			data: { userId: owner.id, status: GuildshipStatus.Owner },
		});
		// update — push guildship id into guild array
		await tx.guild.update({
			where: { id: guild.id },
			data:  { guildshipIds: { push: guildship.id } },
		});
	});

	return { success: true };
}





// getGuildList — (limit?, offset?) → [{ name, owner, banner, members, pending }]
async function getGuildList(limit?: number, offset?: number) {
	// findMany — fetch guilds with pagination
	const guilds = await prisma.guild.findMany({
		orderBy: { id: "asc" },
		take: limit,
		skip: offset,
	});
	// !guilds.length → no results, empty list
	if (!guilds.length) {
		return [];
	}
	// buildGuildViews — assemble full guild views
	return buildGuildViews(guilds);
}





// getGuild — guildName → { name, owner, banner, members, pending } | null
async function getGuild(guildName: string) {
	// findUnique — resolve guild name to guild record
	const guild = await prisma.guild.findUnique({ where: { name: guildName } });
	// !guild → guild not found
	if (!guild) {
		return null;
	}
	// buildGuildViews — assemble guild view
	const views = await buildGuildViews([guild]);
	return views[0] ?? null;
}





// buildGuildViews — guilds[] → GuildView[]
async function buildGuildViews(guilds: { id: number; name: string; banner: string; guildshipIds: number[] }[]) {
	// collect all guildship ids across all guilds
	const allShipIds: number[] = [];
	for (const g of guilds) {
		for (const id of g.guildshipIds) {
			allShipIds.push(id);
		}
	}

	// findMany — load all guildships in one query
	let allShips: { id: number; userId: number; status: GuildshipStatus }[] = [];
	if (allShipIds.length) {
		allShips = await prisma.guildship.findMany({ where: { id: { in: allShipIds } } });
	}

	// group guildships by guild id for fast lookup — pre-index allShips by id then single pass per guild
	const shipById = new Map<number, typeof allShips[number]>();
	for (const s of allShips) {
		shipById.set(s.id, s);
	}
	const shipsByGuild = new Map<number, typeof allShips>();
	for (const g of guilds) {
		const ships: typeof allShips = [];
		for (const id of g.guildshipIds) {
			const s = shipById.get(id);
			if (s) ships.push(s);
		}
		shipsByGuild.set(g.id, ships);
	}

	// collect all unique user ids referenced (Set for O(n) dedup)
	const userIds = [...new Set(allShips.map(s => s.userId))];

	// findMany — load all users in one query
	let allUsers: { id: number; username: string; avatar: string; status: UserStatus }[] = [];
	if (userIds.length) {
		allUsers = await prisma.user.findMany({
			where:  { id: { in: userIds } },
			select: { id: true, username: true, avatar: true, status: true },
		});
	}

	// build user lookup map
	const userById = new Map<number, typeof allUsers[number]>();
	for (const u of allUsers) {
		userById.set(u.id, u);
	}

	// assemble views — pure in-memory, no more DB calls
	const views = [];
	for (const guild of guilds) {
		const ships = shipsByGuild.get(guild.id) ?? [];
		const owner: { username: string; avatar: string; status: UserStatus }[] = [];
		const members: { username: string; avatar: string; status: UserStatus }[] = [];
		const pending: { username: string; avatar: string; status: UserStatus; guildStatus: GuildshipStatus }[] = [];

		for (const r of ships) {
			const u = userById.get(r.userId);
			// !u → user deleted mid-operation, skip
			if (!u) {
				continue;
			}
			// r.status === Owner → collect owners
			if (r.status === GuildshipStatus.Owner) {
				owner.push({ username: u.username, avatar: u.avatar, status: u.status });
			}
			// Owner or User → collect members
			if (r.status === GuildshipStatus.Owner || r.status === GuildshipStatus.User) {
				members.push({ username: u.username, avatar: u.avatar, status: u.status });
			}
			// UserRequest or OwnerRequest → collect pending
			if (r.status === GuildshipStatus.UserRequest || r.status === GuildshipStatus.OwnerRequest) {
				pending.push({ username: u.username, avatar: u.avatar, status: u.status, guildStatus: r.status });
			}
		}
		views.push({ name: guild.name, owner, members, pending, banner: guild.banner });
	}
	return views;
}





// getDirectionalGuildRequestsGlobal — username, direction → pending requests across all guilds
async function getDirectionalGuildRequestsGlobal(username: string, direction: "incoming" | "outgoing") {
	// lookupUser — resolve username to user record
	const me = await lookupUser(username);

	// direction === outgoing → batch guild lookup instead of N+1 per row
	if (direction === "outgoing") {
		// findMany — fetch outgoing UserRequest rows
		const rows = await prisma.guildship.findMany({
			where: { userId: me.id, status: GuildshipStatus.UserRequest },
		});
		// !rows.length → no results, empty list
		if (!rows.length) {
			return [];
		}
		// findMany — batch: find all guilds containing these guildship IDs
		const guilds = await prisma.guild.findMany({
			where: { guildshipIds: { hasSome: rows.map(r => r.id) } },
			select: { name: true },
		});
		return guilds;
	}

	// incoming: batch queries instead of N+1 per guild
	const results = new Map<string, { username: string; avatar: string; status: string }>();

	// findMany — find all owner guildships for this user
	const myOwnerShips = await prisma.guildship.findMany({
		where: { userId: me.id, status: GuildshipStatus.Owner },
	});
	// !myOwnerShips.length → not an owner of any guild
	if (!myOwnerShips.length) return [];

	// findMany — find which guilds these belong to in one query
	const ownedGuilds = await prisma.guild.findMany({
		where: { guildshipIds: { hasSome: myOwnerShips.map(s => s.id) } },
		take: PAGINATION_MAX,
	});
	// !ownedGuilds.length → owned guilds not found
	if (!ownedGuilds.length) return [];

	// collect all guildship IDs from owned guilds and find pending rows
	const allOwnedShipIds = ownedGuilds.flatMap(g => g.guildshipIds);
	// findMany — find pending UserRequest rows
	const pendingRows = await prisma.guildship.findMany({
		where: { id: { in: allOwnedShipIds }, status: GuildshipStatus.UserRequest },
	});
	// !pendingRows.length → no pending requests
	if (!pendingRows.length) return [];

	// findMany — fetch all pending users in one batch
	const users = await prisma.user.findMany({
		where: { id: { in: pendingRows.map(r => r.userId) } },
		select: { username: true, avatar: true, status: true },
	});
	for (const u of users) results.set(u.username, u);

	return [...results.values()];
}





// getDirectionalGuildRequests — guildName, direction → [{ username, avatar, status }]
async function getDirectionalGuildRequests(guildName: string, direction: "incoming" | "outgoing") {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// !guildshipIds.length → no rows, empty list
	if (!guild.guildshipIds.length) {
		return [];
	}

	const status = direction === "incoming"
		? GuildshipStatus.UserRequest
		: GuildshipStatus.OwnerRequest;

	// findMany — fetch guildship rows by status
	const rows = await prisma.guildship.findMany({
		where: { id: { in: guild.guildshipIds }, status },
	});
	// !rows.length → no results, empty list
	if (!rows.length) {
		return [];
	}

	// findMany — fetch pending user profiles
	return prisma.user.findMany({
		where:  { id: { in: rows.map(r => r.userId) } },
		select: { username: true, avatar: true, status: true },
	});
}





// editGuild — guildName, opts, requesterUsername → guild view
async function editGuild(guildName: string, opts: { name?: string; filename?: string; buffer?: Buffer; mimetype?: string }, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve requester username
	const requester = await lookupUser(requesterUsername);

	// !isGuildOwner → not guild owner, reject
	if (!(await isGuildOwner(guildName, requester.id))) {
		throw new Error("error.notGuildOwnerUpdate");
	}

	const updates: Record<string, string> = {};

	// opts.name → name change check
	if (opts.name) {
		// findUnique — check if new name is taken
		const conflict = await prisma.guild.findUnique({ where: { name: opts.name } });
		// conflict && conflict.id !== guild.id → name taken by another guild
		if (conflict && conflict.id !== guild.id) {
			throw new Error("error.guildNameTaken");
		}
		updates.name = opts.name;
	}

	// opts.filename && opts.buffer → banner upload
	if (opts.filename && opts.buffer) {
		// saveUploadedFile — persist banner to disk
		updates.banner = await saveUploadedFile(
			"uploads/banners",
			opts.mimetype || "",
			opts.buffer,
			guild.banner || undefined,
		);
	}

	// no updates → return current state
	if (Object.keys(updates).length === 0) {
		// getGuild — fetch current guild view
		const g = await getGuild(guildName);
		if (!g) throw new Error("error.guildNotFound");
		return g;
	}

	// update — apply field changes
	await prisma.guild.update({ where: { id: guild.id }, data: updates });

	// getGuild — fetch updated guild view
	const g = await getGuild(updates.name ?? guildName);
	if (!g) throw new Error("error.guildNotFound");
	return g;
}





// deleteGuild — guildName, requesterUsername → { success: true }
async function deleteGuild(guildName: string, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve requester username
	const requester = await lookupUser(requesterUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	const result = await prisma.$transaction(async (tx) => {
		// findOwnerRow — not an owner, reject
		const ownerRow = await findOwnerRow(guild, requester.id, tx);
		if (!ownerRow) {
			throw new Error("error.notGuildOwnerDelete");
		}
		// guildshipIds → delete all guildships in this guild
		if (guild.guildshipIds.length) {
			// deleteMany — delete all guildship rows
			await tx.guildship.deleteMany({
				where: { id: { in: guild.guildshipIds } },
			});
		}
		// delete — delete guild row
		await tx.guild.delete({ where: { id: guild.id } });
		return { success: true };
	});

	// guild.banner → remove banner from disk
	if (guild.banner) {
		await fs.promises.unlink("." + guild.banner).catch(() => {});
	}
	return result;
}





// createGuildRequest — send join request (self) or owner invite, silently discard if blocked [Rule 1/2]
async function createGuildRequest(guildName: string, senderUsername: string, targetUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve sender and target usernames
	const sender = await lookupUser(senderUsername);
	const target = await lookupUser(targetUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findOwnerRow — determine sender's role
		const senderOwnerRow = await findOwnerRow(guild, sender.id, tx);
		const senderIsOwner = senderOwnerRow !== null;

		// senderIsOwner && sender.id === target.id → owner cannot self-request, reject [Rule 1/2]
		if (senderIsOwner && sender.id === target.id) {
			throw new Error("error.alreadyGuildOwner");
		}
		// !senderIsOwner && sender.id !== target.id → non-owner can only join self, reject [Rule 1/2]
		if (!senderIsOwner && sender.id !== target.id) {
			throw new Error("error.notGuildOwnerUpdate");
		}

		// loadUsershipUser — check if target blocked sender in friendship system
		const targetData = await loadUsershipUser({ id: target.id }, tx);
		// usershipIds.length → check for block
		if (targetData.usershipIds.length) {
			// findUsershipRow — check for block row
			const blocked = await findUsershipRow(targetData, sender.id, UsershipStatus.Blocked, tx);
			// blocked → silently discard request
			if (blocked) return { success: true };
		}

		// findGuildshipRow — check if target already has a guildship here
		const existing = await findGuildshipRow(guild, target.id, tx);
		// existing → check status [Rule 1/2]
		if (existing) {
			// User or Owner → already a member, reject [Rule 1/2]
			if (existing.status === GuildshipStatus.User || existing.status === GuildshipStatus.Owner) {
				throw new Error("error.alreadyMember");
			}
			// duplicate request → reject [Rule 1/2]
			throw new Error("error.alreadyGuildRequested");
		}

		// determine status: OwnerRequest for owner invite, UserRequest for join request
		const isOwnerInvite = senderIsOwner && sender.id !== target.id;
		const status = isOwnerInvite
			? GuildshipStatus.OwnerRequest
			: GuildshipStatus.UserRequest;

		// create — create the guildship row [Rule 1/2]
		const gs = await tx.guildship.create({ data: { userId: target.id, status } });
		// update — push guildship id into guild array
		await tx.guild.update({
			where: { id: guild.id },
			data:  { guildshipIds: { push: gs.id } },
		});

		return { success: true };
	});
}





// removeGuildRequest — decline join request (owner) or cancel invite (user) [Rule 4/6]
async function removeGuildRequest(guildName: string, username: string, direction: "incoming" | "outgoing") {
	const isIncoming = direction === "incoming";
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve member username
	const member = await lookupUser(username);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findPendingGuildshipRow — find the member's pending guildship row
		const row = await findPendingGuildshipRow(guild, member.id, tx);
		// !row → no pending row found, reject [Rule 4/6]
		if (!row) {
			throw new Error(isIncoming ? "error.noGuildPending" : "error.noGuildRequest");
		}
		// removeGuildshipFromGuild — delete row and remove id from guild array [Rule 4/6]
		await removeGuildshipFromGuild(tx, guild, row);
		return { success: true };
	});
}





// acceptGuildRequest — owner accepts join request or user accepts owner invite [Rule 3/5]
async function acceptGuildRequest(guildName: string, targetUsername: string, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve target and requester usernames
	const target = await lookupUser(targetUsername);
	const requester = await lookupUser(requesterUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findPendingGuildshipRow — find the target's pending guildship row
		const targetRow = await findPendingGuildshipRow(guild, target.id, tx);
		// !targetRow → no pending row, reject [Rule 3/5]
		if (!targetRow) {
			throw new Error("error.noGuildPending");
		}

		// authorize: who may accept depends on the pending type
		// OwnerRequest → only the invited user can accept [Rule 5]
		if (targetRow.status === GuildshipStatus.OwnerRequest) {
			// requester.id !== target.id → not the invited user, reject [Rule 5]
			if (requester.id !== target.id) {
				throw new Error("error.notGuildOwnerAccept");
			}
		// UserRequest → only a guild owner can accept [Rule 3]
		} else {
			// findOwnerRow — check if requester is owner [Rule 3]
			const requesterRow = await findOwnerRow(guild, requester.id, tx);
			// !requesterRow → not an owner, reject [Rule 3]
			if (!requesterRow) {
				throw new Error("error.notGuildOwnerAccept");
			}
		}

		// update — flip to member [Rule 3/5]
		await tx.guildship.update({
			where: { id: targetRow.id },
			data:  { status: GuildshipStatus.User },
		});

		return { success: true };
	});
}





// deleteGuildship — owner kicks member with last-owner guard [Rule 7]
async function deleteGuildship(guildName: string, targetUsername: string, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve target and requester usernames
	const target = await lookupUser(targetUsername);
	const requester = await lookupUser(requesterUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findOwnerRow — not an owner, reject [Rule 7]
		const requesterRow = await findOwnerRow(guild, requester.id, tx);
		// !requesterRow → not guild owner, reject [Rule 7]
		if (!requesterRow) {
			throw new Error("error.notGuildOwnerRemove");
		}
		// target.id === requester.id → cannot remove self, reject [Rule 7]
		if (target.id === requester.id) {
			throw new Error("error.ownerCannotBeRemoved");
		}

		// findGuildshipRow — find target's guildship row
		const targetRow = await findGuildshipRow(guild, target.id, tx);
		// !targetRow || status not User/Owner → not a member, reject [Rule 7]
		if (!targetRow || (targetRow.status !== GuildshipStatus.User && targetRow.status !== GuildshipStatus.Owner)) {
			throw new Error("error.notMember");
		}

		// targetRow.status === Owner → check not the last one [Rule 7]
		if (targetRow.status === GuildshipStatus.Owner) {
			await requireNotLastOwner(tx, guild, targetRow.id);
		}

		// removeGuildshipFromGuild — delete row + remove id from guild array [Rule 7]
		await removeGuildshipFromGuild(tx, guild, targetRow);
		return { success: true };
	});
}





// promoteMember — any owner promotes a User to Owner [Rule 8]
async function promoteMember(guildName: string, targetUsername: string, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve target and requester usernames
	const target = await lookupUser(targetUsername);
	const requester = await lookupUser(requesterUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findOwnerRow — not an owner, reject [Rule 8]
		const requesterRow = await findOwnerRow(guild, requester.id, tx);
		// !requesterRow → not guild owner, reject [Rule 8]
		if (!requesterRow) {
			throw new Error("error.notGuildOwnerUpdate");
		}

		// findGuildshipRow — find target's guildship row
		const targetRow = await findGuildshipRow(guild, target.id, tx);
		// !targetRow || status not User/Owner → target must currently be a member [Rule 8]
		if (!targetRow || (targetRow.status !== GuildshipStatus.User && targetRow.status !== GuildshipStatus.Owner)) {
			throw new Error("error.newOwnerMustBeMember");
		}
		// targetRow.status === Owner → already an owner, reject [Rule 8]
		if (targetRow.status === GuildshipStatus.Owner) {
			throw new Error("error.alreadyGuildOwner");
		}

		// update — promote to owner [Rule 8]
		await tx.guildship.update({
			where: { id: targetRow.id },
			data:  { status: GuildshipStatus.Owner },
		});

		return { success: true };
	});
}





// demoteOwner — any owner demotes another owner to User, last owner protected [Rule 9]
async function demoteOwner(guildName: string, targetUsername: string, requesterUsername: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve target and requester usernames
	const target = await lookupUser(targetUsername);
	const requester = await lookupUser(requesterUsername);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findOwnerRow — not an owner, reject [Rule 9]
		const requesterRow = await findOwnerRow(guild, requester.id, tx);
		// !requesterRow → not guild owner, reject [Rule 9]
		if (!requesterRow) {
			throw new Error("error.notGuildOwnerUpdate");
		}

		// findGuildshipRow — find target's guildship row
		const targetRow = await findGuildshipRow(guild, target.id, tx);
		// !targetRow || status !== Owner → target must currently be an owner [Rule 9]
		if (!targetRow || targetRow.status !== GuildshipStatus.Owner) {
			throw new Error("error.notMember");
		}
		// requireNotLastOwner — last owner cannot be demoted [Rule 9]
		await requireNotLastOwner(tx, guild, targetRow.id);

		// update — demote to user [Rule 9]
		await tx.guildship.update({
			where: { id: targetRow.id },
			data:  { status: GuildshipStatus.User },
		});

		return { success: true };
	});
}





// leaveGuild — self-removal with last-owner guard [Rule 7]
async function leaveGuild(guildName: string, username: string) {
	// lookupGuild — resolve guild name to guild record
	const guild = await lookupGuild(guildName);
	// lookupUser — resolve my username
	const me = await lookupUser(username);

	// $transaction — prevent race conditions: all queries succeed or none
	return prisma.$transaction(async (tx) => {
		// findGuildshipRow — find user's guildship row
		const myRow = await findGuildshipRow(guild, me.id, tx);
		// !myRow || status not User/Owner → not a member, reject [Rule 7]
		if (!myRow || (myRow.status !== GuildshipStatus.User && myRow.status !== GuildshipStatus.Owner)) {
			throw new Error("error.notMember");
		}

		// myRow.status === Owner → check not the last one [Rule 7]
		if (myRow.status === GuildshipStatus.Owner) {
			await requireNotLastOwner(tx, guild, myRow.id);
		}

		// removeGuildshipFromGuild — delete row + remove id from guild array [Rule 7]
		await removeGuildshipFromGuild(tx, guild, myRow);
		return { success: true };
	});
}





// guildsRoutes — register all guild endpoints with auth preHandler
async function guildsRoutes(app: FastifyInstance) {
	app.addHook("preHandler", requireAuth);

	app.post("/", wrapHandler(async (request, reply) => {
		// validateBody — parse guild creation data
		const data = validateBody(createGuildSchema, request.body, reply);
		// !data → validation failed
		if (!data) return;
		// createGuild — create new guild
		return await createGuild(data.name, request.user.username);
	}));

	app.get("/", wrapHandler(async (request) => {
		const { limit, offset } = request.query as { limit?: string; offset?: string };
		const l = Math.min(Number(limit) || PAGINATION_DEFAULT, PAGINATION_MAX);
		const o = Number(offset) || 0;
		// getGuildList — fetch paginated guild list
		return await getGuildList(l, o);
	}));

	app.get("/:name", wrapHandler(async (request, reply) => {
		const { name: guildName } = request.params as { name: string };
		// getGuild — fetch single guild
		const guild = await getGuild(guildName);
		// !guild → guild not found, return 404
		if (!guild) return reply.status(404).send({ error: "error.guildNotFound" });
		return guild;
	}));

	app.post("/:name", wrapHandler(async (request, reply) => {
		const { name: guildName } = request.params as { name: string };

		// isMultipart → handle file upload
		if (request.isMultipart()) {
			// validateMultipart — extract and validate uploaded file
			const result = await validateMultipart(request, reply);
			// !result → validation failed
			if (!result) return;

			const { file, buffer, fields } = result;
			// validateBody — parse optional guild edit fields
			const data = validateBody(editGuildSchema, {
				name: fields.name?.value,
			}, reply);
			// !data → validation failed
			if (!data) return;
			// editGuild — update guild with banner
			return await editGuild(guildName, {
				filename: file.filename,
				mimetype: file.mimetype,
				buffer,
				...data,
			}, request.user.username);
		}

		// validateBody — parse JSON edit data
		const data = validateBody(editGuildSchema, request.body, reply);
		// !data → validation failed
		if (!data) return;
		// editGuild — update guild without banner
		return await editGuild(guildName, data, request.user.username);
	}));

	app.post("/:name/remove", wrapHandler(async (request) => {
		const { name: guildName } = request.params as { name: string };
		// deleteGuild — cascade delete guild
		return await deleteGuild(guildName, request.user.username);
	}));

	app.post("/:name/request/:username", wrapHandler(async (request) => {
		const { name: guildName, username } = request.params as { name: string; username: string };
		// "me" → self-join request, otherwise owner inviting username
		const target = username === "me" ? request.user.username : username;
		// createGuildRequest — send join request or owner invite
		return await createGuildRequest(guildName, request.user.username, target);
	}));

	app.post("/:name/pending/:direction/:username", wrapHandler(async (request, reply) => {
		const { name: guildName, direction, username } = request.params as {
			name: string; direction: "incoming" | "outgoing"; username: string;
		};
		// direction === outgoing → resolve "me" shorthand or use explicit username
		if (direction === "outgoing") {
			const target = username === "me" ? request.user.username : username;
			return await removeGuildRequest(guildName, target, "outgoing");
		}
		// !isGuildOwner → not guild owner, reject
		if (!(await isGuildOwner(guildName, request.user.id))) {
			return reply.status(403).send({ error: "error.notGuildOwnerDeny" });
		}
		// removeGuildRequest — decline incoming request
		return await removeGuildRequest(guildName, username, "incoming");
	}));

	app.get("/pending/:direction", wrapHandler(async (request) => {
		const { direction } = request.params as { direction: "incoming" | "outgoing" };
		// getDirectionalGuildRequestsGlobal — fetch pending requests across all owned guilds
		return await getDirectionalGuildRequestsGlobal(request.user.username, direction);
	}));

	app.get("/:name/pending/:direction", wrapHandler(async (request) => {
		const { name: guildName, direction } = request.params as { name: string; direction: "incoming" | "outgoing" };
		// getDirectionalGuildRequests — fetch pending requests for a specific guild
		return await getDirectionalGuildRequests(guildName, direction);
	}));

	app.post("/:name/accept/:username", wrapHandler(async (request) => {
		const { name: guildName, username } = request.params as { name: string; username: string };
		// acceptGuildRequest — accept pending guild request
		return await acceptGuildRequest(guildName, username, request.user.username);
	}));

	app.post("/:name/leave", wrapHandler(async (request) => {
		const { name: guildName } = request.params as { name: string };
		// leaveGuild — self-removal from guild
		return await leaveGuild(guildName, request.user.username);
	}));

	app.post("/:name/promote/:username", wrapHandler(async (request) => {
		const { name: guildName, username } = request.params as { name: string; username: string };
		// promoteMember — promote user to owner
		return await promoteMember(guildName, username, request.user.username);
	}));

	app.post("/:name/demote/:username", wrapHandler(async (request) => {
		const { name: guildName, username } = request.params as { name: string; username: string };
		// demoteOwner — demote owner to member
		return await demoteOwner(guildName, username, request.user.username);
	}));

	app.post("/:name/remove/:username", wrapHandler(async (request) => {
		const { name: guildName, username } = request.params as { name: string; username: string };
		// deleteGuildship — owner kicks member
		return await deleteGuildship(guildName, username, request.user.username);
	}));
}










export default guildsRoutes;
