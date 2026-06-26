//initialiser socket.IO
//recuperer user depuis cookie JWT
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

// Map to keep track of online users and their corresponding socket IDs
const onlineSockets = new Map<number, Set<string>>();

// getCookie function to extract a specific cookie value from the raw cookie string
function getCookie(rawCookie: string | undefined, name: string): string | null {
    if (!rawCookie)
        return null;

    const cookies = rawCookie.split(';').map(c => c.trim());

    // Iterate through the cookies to find the one with the specified name
    for (const cookie of cookies) {
        const [key, ...value] = cookie.split('=');
        if (key === name) {
            return decodeURIComponent(value.join('='));
        }
        return null;
    }
}