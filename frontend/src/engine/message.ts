import { API_BASE, apiGet, apiPost } from "./api.ts";

export const API_MESSAGE = `${API_BASE}/api/message`;

export interface ChatMessage {
	id: number;
	userId: number;
	content: string;
	time: string;
}

export function getConversation(username: string) {
	return apiGet<ChatMessage[]>(`${API_MESSAGE}/${username}`);
}

export function createMessage(username: string, content: string) {
	return apiPost<ChatMessage>(`${API_MESSAGE}/${username}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
}