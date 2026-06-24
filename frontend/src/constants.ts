export const USERNAME_MIN   = 3;
export const USERNAME_MAX   = 30;

export const PASSWORD_MIN   = 8;
export const PASSWORD_MAX   = 60;

export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 30;





export type Lang = "en" | "fr";


export type Messages = Record<string, string | Record<string, any>>;





export type UserRole              = "User" | "Moderator" | "Admin";
export type UserStatus            = "Online" | "Offline";
export type UsershipStatus        = "Pending" | "Requested" | "Friend" | "Blocked";
export type GuildshipStatus       = "Owner" | "User" | "UserRequest" | "OwnerRequest";
export type CardRarity            = "Common" | "Uncommon" | "Rare" | "Legendary";
export type CardType              = "None" | "Normal" | "Fire" | "Water" | "Electric" | "Grass" | "Ice" | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug" | "Rock" | "Ghost" | "Dragon";
export type Direction             = "incoming" | "outgoing";





export interface Profile { email: string; username: string; avatar: string; status: string; language: string; }
export interface PublicUser { username: string; avatar: string; status: string; }
export interface PendingGuild { name: string; }
export interface GuildView { name: string; owner: PublicUser[]; members: PublicUser[]; pending: (PublicUser & { guildStatus: GuildshipStatus })[]; banner: string; }
export interface Card { name: string; pokemon: string; rarity: CardRarity; type: CardType | null; subType: CardType | null; health: number; image: string; }
export interface Ok { success: true; }





// sanitizeText — strip HTML tags and trim whitespace
function sanitizeText(raw: string): string {
	return raw.replace(/<[^>]*>/g, "").trim();
}
export const sanitize = sanitizeText;





