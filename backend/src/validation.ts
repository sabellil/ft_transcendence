import { z } from "zod";

import { CardRarity, CardType } from "@prisma/client";

import { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN, PASSWORD_MAX, GUILD_NAME_MIN, GUILD_NAME_MAX } from "./constants.ts";

import { sanitize } from "./constants.ts";




// loginSchema — validate login request body
export const loginSchema = z.object({
	username: z.string()
		.min(1, "validation.fieldRequired")
		.max(USERNAME_MAX, "validation.usernameTooLong")
		.trim()
		.toLowerCase(),
	password: z.string()
		.min(1, "validation.fieldRequired")
		.max(PASSWORD_MAX, "validation.passwordTooLong"),
});




// registerSchema — validate registration request body
export const registerSchema = z.object({
	email: z.string()
		.email("validation.emailInvalid")
		.trim()
		.toLowerCase(),
	username: z.string()
		.min(USERNAME_MIN, "validation.usernameTooShort")
		.max(USERNAME_MAX, "validation.usernameTooLong")
		.trim()
		.toLowerCase()
		.transform(sanitize),
	password: z.string()
		.min(PASSWORD_MIN, "validation.passwordTooShort")
		.max(PASSWORD_MAX, "validation.passwordTooLong")
		.regex(/[A-Z]/, "validation.passwordUppercase")
		.regex(/[a-z]/, "validation.passwordLowercase")
		.regex(/[0-9]/, "validation.passwordDigit"),
});




// usernameUserSchema — validate user username request body
export const usernameUserSchema = registerSchema.shape.username;




// editUserSchema — validate profile edit request body
export const editUserSchema = registerSchema.extend({
	language: z.enum(["en", "fr"]).optional(),
}).partial();




// createGuildSchema — validate guild creation request body
export const createGuildSchema = z.object({
	name: z.string()
		.min(GUILD_NAME_MIN, "validation.guildNameTooShort")
		.max(GUILD_NAME_MAX, "validation.guildNameTooLong")
		.trim()
		.transform(sanitize),
});




// nameGuildSchema — validate guild name request body
export const nameGuildSchema = createGuildSchema.shape.name;




// editGuildSchema — validate guild edit request body
export const editGuildSchema = createGuildSchema.partial();




// createCardSchema — validate card creation request body
export const createCardSchema = z.object({
	name: z.string()
		.min(1, "validation.cardNameRequired")
		.trim()
		.transform(sanitize),
	pokemon: z.string()
		.min(1, "validation.cardPokemonRequired")
		.trim()
		.transform(sanitize),
	rarity:  z.nativeEnum(CardRarity, { message: "validation.invalidCardRarity" }),
	type:    z.nativeEnum(CardType,   { message: "validation.invalidCardType"   }),
	subType: z.nativeEnum(CardType,   { message: "validation.invalidCardType"   }).optional(),
	health:  z.number()
		.int()
		.min(0, "validation.invalidHealth"),
});




// editCardSchema — validate card edit request body
export const editCardSchema = createCardSchema.partial();



// createMessageSchema — validate message creation request body
export const createMessageSchema = z.object({
	content: z.string()
		.min(1, "validation.fieldRequired")
		.max(100, "error.messageTooLong")
		.trim(),
});
