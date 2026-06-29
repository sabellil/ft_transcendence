import { API_BASE, apiGet, apiPost } from "./api.ts";

// API_MESSAGE — base URL for message-related API endpoints
export const API_MESSAGE = `${API_BASE}/api/message`;

// ChatMessage — interface representing a chat message structure
export interface ChatMessage {
	id: number;
	userId: number;
    username: string;
	content: string;
	time: string;
}

// getConversation - fetches the conversation history with a specific user
export function getConversation(username: string) {
	return apiGet<ChatMessage[]>(`${API_MESSAGE}/${username}`);
}

// createMessage - sends a new chat message to a specific user
export function createMessage(username: string, content: string) {
	return apiPost<ChatMessage>(`${API_MESSAGE}/${username}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
}