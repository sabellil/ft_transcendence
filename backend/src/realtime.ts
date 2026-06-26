//initialiser socket.IO
//recuperer user depuis cookie JWT OK
//marquer Online le user
//Prevenir les amis que le user est Online
//Gerer disconnect GrAceFulLy
//marquer Offline le user
//Prevenir les amis que le user est Offline

//Objectif : frontend se connecte et la connexion reste ouverte pour que backend puisse envoyer des notifications en temps réel au frontend

import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import jwt from "jsonwebtoken"
import { UserStatus, UsershipStatus } from "@prisma/client";
import { prisma, JWT_SECRET } from "./constants.ts";


type JwtPayload = {
    id: number;
};

// Map to keep track of online users and their corresponding socket IDs, starts empty
const onlineSockets = new Map<number, Set<string>>();

// getCookie - extract a specific cookie value from the raw cookie string
function getCookie(rawCookie: string | undefined, name: string): string | null {
    if (!rawCookie) return null;

    const cookies = rawCookie.split(';').map(c => c.trim());

    // Iterate through the cookies to find the one with the specified name
    for (const cookie of cookies) {
        const [key, ...value] = cookie.split('=');
    // If the cookie name matches, return the decoded value
    if (key === name) { return decodeURIComponent(value.join('='));}
    }
    return null;
}

// getFriendsIds -  get the IDs of friends for a given user
async function getFriendsIds(userId: number): Promise<number[]> {
    // Fetch the user from the database, selecting only the usership IDs
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { usershipIds: true },
    });

    // If the user doesn't exist or has no friends, return an empty array
    if (!user || !user.usershipIds.length) return [];

    const rows = await prisma.usership.findMany({
        where: { id: { in: user.usershipIds }, status : UsershipStatus.Friend },
        select: { userId: true },
    });

    return rows.map(row => row.userId);
}

// Initialize the Socket.IO server and set up event listeners
let ioInstance: Server | null = null;

async function notifyFriends(userId: number, event: "friend:online" | "friend:offline") {
    // Fetch the user's details from the database, selecting only the necessary fields
    const user = await.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, avatar: true, status: true },
    });

    if (!user) return;
    // Get the IDs of the user's friends
    const friendsIds = await getFriendsIds(userId);
    for (const friendId of friendsIds) {
        const sockets = onlineSockets.get(friendId);
        // If the friend is not online, skip to the next friend
        if (!sockets) continue;
        // Emit the event to each of the friend's sockets, sending the user's details
        for (const socketId of sockets) {
            ioInstance?.to(socketId).emit(event, { username: user.username, avatar: user.avatar, status: user.status });
        }
    }
}

// Setup the real-time communication using Socket.IO
export function setupRealtime(app: FastifyInstance) {
    // Create a new Socket.IO server instance, attaching it to the Fastify server
    const io = new Server(app.server, {
        cors: {
            origin: true, // Allow all origins for CORS (Cross-Origin Resource Sharing)
            credentials: true, // Allow credentials (cookies, authorization headers)
        },
    });
    ioInstance = io;
    // Listen for new socket connections TODO
}

