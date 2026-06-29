import { API_FRIEND, API_BLOCK, apiGet, apiPost } from "./api.ts";


import type { PublicUser, Direction, Ok } from "../constants.ts";





// getFriendList — fetch all friends (auth via cookie)
export function getFriendList() {
	return apiGet<PublicUser[]>(API_FRIEND);
}





// getDirectionalFriendRequests — fetch incoming or outgoing pending requests
export function getDirectionalFriendRequests(direction: Direction) {
	return apiGet<PublicUser[]>(`${API_FRIEND}/pending/${direction}`);
}





// createFriendRequest — send friend request to user
export function createFriendRequest(username: string) {
	return apiPost<Ok>(`${API_FRIEND}/request/${(username)}`);
}





// acceptFriendRequest — accept incoming friend request
export function acceptFriendRequest(username: string) {
	return apiPost<Ok>(`${API_FRIEND}/accept/${(username)}`);
}





// removeFriendRequest — decline or cancel a pending request
export function removeFriendRequest(username: string, direction: Direction) {
	return apiPost<Ok>(`${API_FRIEND}/pending/${direction}/${(username)}`);
}





// deleteUsership — unfriend a user
export function deleteUsership(username: string) {
	return apiPost<Ok>(`${API_FRIEND}/remove/${(username)}`);
}





// getBlockList — fetch all blocked users
export function getBlockList() {
	return apiGet<PublicUser[]>(API_BLOCK);
}





// createBlock — block a user
export function createBlock(username: string) {
	return apiPost<Ok>(`${API_BLOCK}/${(username)}`);
}





// deleteBlock — unblock a user
export function deleteBlock(username: string) {
	return apiPost<Ok>(`${API_BLOCK}/remove/${(username)}`);
}
