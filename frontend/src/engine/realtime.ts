import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api.ts";

// socket — holds the current Socket.IO connection instance, initialized as null
let socket: Socket | null = null;


export function connectRealTime() {
	if (socket) return socket;

	socket = io(API_BASE, {
		withCredentials: true,
	});

	return socket;
}

export function disconnectRealTime() {
	if (!socket) return;

	socket.disconnect();
	socket = null;
}