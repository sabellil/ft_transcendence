import { API_FRIEND, API_BLOCK, apiGet, apiPost } from "./api.ts";


import type { PublicUser, Direction, Ok } from "../constants.ts";





// getFriendList — fetch all friends (first param ignored, cookie provides auth)
export function getFriendList(_user?: string) {
	return apiGet<PublicUser[]>(API_FRIEND);
}





// getDirectionalFriendRequests — fetch incoming or outgoing pending requests
export function getDirectionalFriendRequests(_user: string, direction: Direction) {
	return apiGet<PublicUser[]>(`${API_FRIEND}/pending/${direction}`);
}





// createFriendRequest — send friend request to user
export function createFriendRequest(_user: string, username: string) {
	return apiPost<Ok>(`${API_FRIEND}/request/${(username)}`);
}





// acceptFriendRequest — accept incoming friend request
export function acceptFriendRequest(_user: string, username: string) {
	return apiPost<Ok>(`${API_FRIEND}/accept/${(username)}`);
}





// removeFriendRequest — decline or cancel a pending request
export function removeFriendRequest(_user: string, username: string, direction: Direction) {
	return apiPost<Ok>(`${API_FRIEND}/pending/${direction}/${(username)}`);
}





// deleteUsership — unfriend a user
export function deleteUsership(_user: string, username: string) {
	return apiPost<Ok>(`${API_FRIEND}/remove/${(username)}`);
}





// getBlockList — fetch all blocked users
export function getBlockList(_user?: string) {
	return apiGet<PublicUser[]>(API_BLOCK);
}





// createBlock — block a user
export function createBlock(_user: string, username: string) {
	return apiPost<Ok>(`${API_BLOCK}/${(username)}`);
}





// deleteBlock — unblock a user
export function deleteBlock(_user: string, username: string) {
	return apiPost<Ok>(`${API_BLOCK}/remove/${(username)}`);
}
