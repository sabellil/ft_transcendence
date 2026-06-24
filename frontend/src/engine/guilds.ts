import { API_GUILD, apiGet, apiPost, uploadMultipart, authOpts } from "./api.ts";


import type { GuildView, PublicUser, PendingGuild, Ok, Direction } from "../constants.ts";





// getGuildList — all guilds paginated (first param ignored, cookie provides auth)
export function getGuildList(_user?: string) {
	return apiGet<GuildView[]>(API_GUILD);
}





// getGuild — single guild with members/pending
export function getGuild(_user: string, guildName: string) {
	return apiGet<GuildView>(`${API_GUILD}/${(guildName)}`);
}





// getDirectionalGuildRequests — pending requests across all owned guilds (incoming/outgoing)
export function getDirectionalGuildRequests(_user: string, direction: Direction) {
	return apiGet<(PendingGuild | PublicUser)[]>(`${API_GUILD}/pending/${direction}`);
}





// createGuild — create guild with creator as first owner
export async function createGuild(_user: string, name: string): Promise<Ok> {
	const res = await fetch(API_GUILD, authOpts({ json: { name } }));
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.createGuildFailed");
	return data as Ok;
}





// editGuild — owner-only: update name or banner
export async function editGuild(_user: string, guildName: string, body: { name?: string; bannerFile?: File }) {
	const url = `${API_GUILD}/${(guildName)}`;
	const { bannerFile, ...jsonFields } = body;
	const res = bannerFile
		? await uploadMultipart(url, bannerFile, jsonFields as Record<string, string>)
		: await fetch(url, authOpts({ json: jsonFields }));
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.editGuildFailed");
	return data as GuildView;
}





// deleteGuild — owner-only: cascade delete all guildships
export function deleteGuild(_user: string, guildName: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/remove`);
}





// createGuildRequest — send join request (self) or owner invite [Rule 1/2]
export function createGuildRequest(_user: string, guildName: string, username?: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/request/${username ? (username) : "me"}`);
}





// removeGuildRequest — cancel or refuse pending request [Rule 4/6]
export function removeGuildRequest(_user: string, guildName: string, direction: Direction, username?: string) {
	const target = direction === "outgoing" ? "me" : (username ?? "");
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/pending/${direction}/${target}`);
}





// acceptGuildRequest — pending → member [Rule 3/5]
export function acceptGuildRequest(_user: string, guildName: string, username: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/accept/${(username)}`);
}





// promoteOwner — member → owner [Rule 8]
export function promoteOwner(_user: string, guildName: string, username: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/promote/${(username)}`);
}





// demoteOwner — owner → member, last owner protected [Rule 9]
export function demoteOwner(_user: string, guildName: string, username: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/demote/${(username)}`);
}





// leaveGuild — self-removal with last-owner guard [Rule 7]
export function leaveGuild(_user: string, guildName: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/leave`);
}





// deleteGuildship — owner kicks member with last-owner guard [Rule 7]
export function deleteGuildship(_user: string, guildName: string, username: string) {
	return apiPost<Ok>(`${API_GUILD}/${(guildName)}/remove/${(username)}`);
}
