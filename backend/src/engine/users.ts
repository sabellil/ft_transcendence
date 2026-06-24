import fs from "fs";


import bcrypt from "bcrypt";


import type { FastifyInstance } from "fastify";


import { GuildshipStatus, UsershipStatus } from "@prisma/client";


import { requireAuth, wrapHandler, validateMultipart, saveUploadedFile, validateBody } from "../middleware.ts";


import { editUserSchema } from "../validation.ts";


import { prisma, BCRYPT_ROUNDS } from "../constants.ts";










interface EditUserOpts {
	username?: string | null;
	email?:    string | null;
	password?: string | null;
	language?: string | null;
	filename?: string;
	buffer?:   Buffer;
	mimetype?: string;
}





// createUser — register new user with hashed password
export async function createUser(email: string, username: string, password: string) {
	// hash — bcrypt password with configured rounds
	const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

	// $transaction — prevent race condition on email/username uniqueness
	return prisma.$transaction(async (tx) => {
		// findFirst — check email or username conflict
		const existing = await tx.user.findFirst({
			where: { OR: [{ email }, { username }] },
		});
		// existing → email or username already taken
		if (existing) {
			throw new Error("error.emailOrUsernameTaken");
		}
		// create — insert new user
		await tx.user.create({ data: { email, username, password: hash } });
		return { success: true };
	});
}





// lookupUser — resolve username to id+username (throws if not found)
export async function lookupUser(username: string) {
	// findUnique — fetch user by username
	const user = await prisma.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});
	// !user → user not found
	if (!user) {
		throw new Error("error.userNotFound");
	}
	return user;
}





// getUser — fetch user profile by username
async function getUser(username: string, includeEmail = true) {
	// findUnique — fetch profile fields
	return prisma.user.findUnique({
		where:  { username },
		select: { username: true, avatar: true, status: true, language: true, ...(includeEmail ? { email: true } as const : {}) },
	});
}





// editUser — update user profile fields
async function editUser(username: string, opts: EditUserOpts) {
	// findUnique — fetch current user record
	const current = await prisma.user.findUnique({ where: { username } });
	// !current → user not found
	if (!current) {
		throw new Error("error.userNotFound");
	}

	const fields: Record<string, string> = {};

	// opts.username → update username
	if (opts.username !== undefined && opts.username !== null && opts.username.length > 0) {
		fields.username = opts.username;
	}
	// opts.email → update email
	if (opts.email !== undefined && opts.email !== null && opts.email.length > 0) {
		fields.email = opts.email;
	}
	// opts.password → hash and update password
	if (opts.password) {
		fields.password = await bcrypt.hash(opts.password, BCRYPT_ROUNDS);
	}
	// opts.language → update language preference
	if (opts.language !== undefined && opts.language !== null) {
		fields.language = opts.language;
	}
	// opts.filename && opts.buffer → upload new avatar
	if (opts.filename && opts.buffer) {
		// saveUploadedFile — persist avatar to disk
		fields.avatar = await saveUploadedFile(
			"uploads/avatars",
			opts.mimetype || "",
			opts.buffer,
			current.avatar || undefined,
		);
	}

	// fields not empty → apply updates
	if (Object.keys(fields).length > 0) {
		// update — apply field changes
		await prisma.user.update({ where: { id: current.id }, data: fields });
	}

	const lookupName = fields.username || current.username;
	// getUser — fetch updated profile
	const updated = await getUser(lookupName);
	// !updated → user vanished after update
	if (!updated) {
		throw new Error("error.userNotFound");
	}
	return updated;
}





// deleteUser — cascade delete user, guildships, userships, and cleanup files
async function deleteUser(username: string) {
	const filesToDelete: string[] = [];

	// $transaction — prevent race conditions during cascade delete
	const result = await prisma.$transaction(async (tx) => {
		// findUnique — fetch current user
		const current = await tx.user.findUnique({ where: { username } });
		// !current → user not found
		if (!current) {
			throw new Error("error.userNotFound");
		}

		// current.avatar → queue avatar file for deletion
		if (current.avatar) {
			filesToDelete.push("." + current.avatar);
		}

		// findMany — get user's guildship memberships
		const myGuildships = await tx.guildship.findMany({
			where: { userId: current.id },
		});

		for (const gs of myGuildships) {
			// findFirst — find guild containing this guildship
			const guild = await tx.guild.findFirst({
				where: { guildshipIds: { has: gs.id } },
			});

			// !guild → orphaned guildship, just delete
			if (!guild) {
				await tx.guildship.delete({ where: { id: gs.id } });
				continue;
			}

			// gs.status === Owner → handle last-owner cascade
			if (gs.status === GuildshipStatus.Owner) {
				const otherOwners = guild.guildshipIds
					.filter((id: number) => id !== gs.id)
					.length
					? await tx.guildship.findFirst({
						where: {
							id: { in: guild.guildshipIds.filter((id: number) => id !== gs.id) },
							status: GuildshipStatus.Owner,
						},
					})
					: null;

				// !otherOwners → last owner, delete entire guild
				if (!otherOwners) {
					if (guild.guildshipIds.length) {
						// deleteMany — remove all guildships for this guild
						await tx.guildship.deleteMany({
							where: { id: { in: guild.guildshipIds } },
						});
					}
					// guild.banner → queue banner file for deletion
					if (guild.banner) {
						filesToDelete.push("." + guild.banner);
					}
					// delete — remove guild record
					await tx.guild.delete({ where: { id: guild.id } });
					continue;
				}
			}

			// update — remove guildship id from guild array
			await tx.guild.update({
				where: { id: guild.id },
				data:  { guildshipIds: guild.guildshipIds.filter((id: number) => id !== gs.id) },
			});
			// delete — remove guildship row
			await tx.guildship.delete({ where: { id: gs.id } });
		}

		// current.usershipIds → clean up all friendship relationships
		if (current.usershipIds.length) {
			// findMany — get all usership rows owned by user
			const myUsershipRows = await tx.usership.findMany({
				where: { id: { in: current.usershipIds } },
			});

			for (const row of myUsershipRows) {
				const peerId = row.userId;
				// findUnique — get peer user's usership array
				const peerUser = await tx.user.findUnique({
					where: { id: peerId },
					select: { usershipIds: true },
				});

				// peerUser → find and remove reciprocal rows
				if (peerUser && peerUser.usershipIds.length) {
					// findMany — find reciprocal usership rows on peer
					const peerRows = await tx.usership.findMany({
						where: {
							id: { in: peerUser.usershipIds },
							userId: current.id,
						},
					});
					const peerRowIds = peerRows.map(r => r.id);

					// peerRowIds → clean up peer's usership array
					if (peerRowIds.length) {
						// update — remove reciprocal rows from peer array
						await tx.user.update({
							where: { id: peerId },
							data:  {
								usershipIds: peerUser.usershipIds.filter(
									(id: number) => !peerRowIds.includes(id)
								),
							},
						});
						// deleteMany — remove reciprocal usership rows
						await tx.usership.deleteMany({
							where: { id: { in: peerRowIds } },
						});
					}
				}
			}

			// deleteMany — remove all remaining owned usership rows
			await tx.usership.deleteMany({
				where: { id: { in: current.usershipIds } },
			});
		}

		// findMany — find inbound usership rows pointing to this user
		const inboundRows = await tx.usership.findMany({
			where: { userId: current.id },
		});

		for (const row of inboundRows) {
			// findFirst — find owner of this inbound row
			const owner = await tx.user.findFirst({
				where:  { usershipIds: { has: row.id } },
				select: { id: true, usershipIds: true },
			});
			// owner → clean row from owner's array
			if (owner) {
				// update — remove inbound row from owner array
				await tx.user.update({
					where: { id: owner.id },
					data:  { usershipIds: owner.usershipIds.filter((id: number) => id !== row.id) },
				});
			}
		}
		// inboundRows → delete all inbound usership rows
		if (inboundRows.length) {
			// deleteMany — remove all inbound usership rows
			await tx.usership.deleteMany({ where: { userId: current.id } });
		}

		// cardshipExchangeIds → delete exchange rows
		if (current.cardshipExchangeIds.length) {
			// deleteMany — remove card exchange rows
			await tx.cardshipExchange.deleteMany({
				where: { id: { in: current.cardshipExchangeIds } },
			});
		}
		// cardshipIds → delete card ownership rows
		if (current.cardshipIds.length) {
			// deleteMany — remove card ownership rows
			await tx.cardship.deleteMany({
				where: { id: { in: current.cardshipIds } },
			});
		}
		// messageIds → delete message rows
		if (current.messageIds.length) {
			// deleteMany — remove message rows
			await tx.message.deleteMany({
				where: { id: { in: current.messageIds } },
			});
		}

		// delete — remove user record
		await tx.user.delete({ where: { id: current.id } });
		return { success: true };
	});

	// unlink — delete queued files from disk
	await Promise.all(
		filesToDelete.map(p => fs.promises.unlink(p).catch(() => {})),
	);
	return result;
}





// usersRoutes — register user profile CRUD endpoints on Fastify instance
async function usersRoutes(app: FastifyInstance) {
	app.addHook("preHandler", requireAuth);

	app.get("/", wrapHandler(async (request, reply) => {
		const user = request.user;
		// getUser — fetch own profile
		const profile = await getUser(user.username);
		// !profile → profile not found
		if (!profile) {
			return reply.status(404).send({ error: "error.userNotFound" });
		}
		return profile;
	}));

	app.get("/:username", wrapHandler(async (request, reply) => {
		const requester = request.user;
		const { username } = request.params as { username: string };
		// getUser — fetch target user profile (no email)
		const profile = await getUser(username, false);
		// !profile → user not found
		if (!profile) {
			return reply.status(404).send({ error: "error.userNotFound" });
		}

		// findUnique — check if target blocked requester
		const target = await prisma.user.findUnique({
			where: { username },
			select: { id: true, usershipIds: true },
		});
		// target → check for block
		if (target) {
			// findFirst — search for block from target to requester
			const blocked = await prisma.usership.findFirst({
				where: {
					id: { in: target.usershipIds },
					userId: requester.id,
					status: UsershipStatus.Blocked,
				},
			});
			// blocked → hide profile from blocked user
			if (blocked) {
				return reply.status(404).send({ error: "error.userNotFound" });
			}
		}
		return profile;
	}));

	app.post("/", wrapHandler(async (request, reply) => {
		const user = request.user;

		// isMultipart → handle file upload
		if (request.isMultipart()) {
			// validateMultipart — extract and validate uploaded file
			const result = await validateMultipart(request, reply);
			// !result → validation failed
			if (!result) return;

			const { file, buffer, fields } = result;
			// validateBody — parse optional profile edit fields
			const data = validateBody(editUserSchema, {
				username: fields.username?.value,
				email:    fields.email?.value,
				password: fields.password?.value,
				language: fields.language?.value,
			}, reply);
			// !data → validation failed
			if (!data) return;
			// editUser — update profile with image
			return await editUser(user.username, {
				filename: file.filename,
				mimetype: file.mimetype,
				buffer,
				...data,
			});
		}

		const body = request.body as {
			username?: string | null;
			email?:    string | null;
			password?: string | null;
			language?: string | null;
		};
		// body has fields → validate and apply updates
		if (body.username !== undefined || body.email !== undefined || body.password !== undefined || body.language !== undefined) {
			// validateBody — parse JSON edit data
			const data = validateBody(editUserSchema, body, reply);
			// !data → validation failed
			if (!data) return;
			// editUser — update profile without image
			return await editUser(user.username, data);
		}
		// getUser — return current profile if no updates
		return await getUser(user.username);
	}));

	app.post("/remove", wrapHandler(async (request) => {
		const user = request.user;
		// deleteUser — cascade delete user account
		return await deleteUser(user.username);
	}));
}










export default usersRoutes;
