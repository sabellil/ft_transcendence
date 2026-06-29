import { z } from "zod";


import { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN, PASSWORD_MAX, GUILD_NAME_MIN, GUILD_NAME_MAX } from "./constants.ts";


import { sanitize } from "./constants.ts";


export { sanitize, sanitize as sanitizeUsername };





const CARD_RARITIES = ["Common", "Uncommon", "Rare", "Legendary"] as const;


const CARD_TYPES = ["None", "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon"] as const;





// loginSchema — validate login form input
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





// registerSchema — validate registration form input
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





// individual field schemas
export const usernameSchema = registerSchema.shape.username;
export const passwordSchema = registerSchema.shape.password;
export const emailSchema    = registerSchema.shape.email;

// usernameUserSchema — validate username field from registerSchema
export const usernameUserSchema = usernameSchema;





// editUserSchema — validate profile edit form input (all fields optional)
export const editUserSchema = registerSchema.extend({
	language: z.enum(["en", "fr"]).optional(),
}).partial();





// createGuildSchema — validate guild creation form input
export const createGuildSchema = z.object({
	name: z.string()
		.min(GUILD_NAME_MIN, "validation.guildNameTooShort")
		.max(GUILD_NAME_MAX, "validation.guildNameTooLong")
		.trim()
		.transform(sanitize),
});





// nameGuildSchema — validate guild name field from createGuildSchema
export const nameGuildSchema  = createGuildSchema.shape.name;
export const guildNameSchema  = nameGuildSchema;





// editGuildSchema — validate guild edit form input (all fields optional)
export const editGuildSchema = createGuildSchema.partial();





// createCardSchema — validate card creation form input
export const createCardSchema = z.object({
	name: z.string()
		.min(1, "validation.cardNameRequired")
		.trim()
		.transform(sanitize),
	pokemon: z.string()
		.min(1, "validation.cardPokemonRequired")
		.trim()
		.transform(sanitize),
	rarity:  z.enum(CARD_RARITIES, { message: "validation.invalidCardRarity" }),
	type:    z.enum(CARD_TYPES,   { message: "validation.invalidCardType"   }),
	subType: z.enum(CARD_TYPES,   { message: "validation.invalidCardType"   }).optional(),
	health:  z.number()
		.int()
		.min(0, "validation.invalidHealth"),
});





// editCardSchema — validate card edit form input (all fields optional)
export const editCardSchema = createCardSchema.partial();
