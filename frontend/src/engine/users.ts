import { API_USER, apiGet, uploadMultipart, authOpts } from "./api.ts";


import type { Profile, Ok } from "../constants.ts";








// getUser — fetch current user's profile
export async function getUser() {
	return apiGet<Profile>(API_USER);
}





// getPublicUser — fetch another user's public profile
export async function getPublicUser(username: string) {
	return apiGet<Profile>(`${API_USER}/${(username)}`);
}





// editUser — update own profile with optional avatar upload
export async function editUser(body: {
	username?: string; email?: string; password?: string; avatarFile?: File; language?: string;
}) {
	const { avatarFile, ...jsonFields } = body;

	const res = avatarFile
		? await uploadMultipart(API_USER, avatarFile, jsonFields as Record<string, string>)
		: await fetch(API_USER, authOpts({ json: jsonFields }));

	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.editUserFailed");
	return data as Profile;
}





// deleteUser — delete own account
export async function deleteUser(): Promise<Ok> {
	const res = await fetch(`${API_USER}/remove`, authOpts({ json: {} }));
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.deleteUserFailed");
	return data as Ok;
}
