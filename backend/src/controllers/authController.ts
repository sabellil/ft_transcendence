import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

export async function registerUser(
	email: string,
	username: string,
	password: string
)
{
	const hashedPassword =
		await bcrypt.hash(password, 10);

	const user =
		await prisma.user.create({
			data:
			{
				email,
				username,
				password: hashedPassword
			}
		});

	return user;
}

import jwt from "jsonwebtoken";

export async function loginUser(
	email: string,
	password: string
)
{
	const user =
		await prisma.user.findUnique({
			where: { email }
		});

	if (!user)
		throw new Error("Invalid credentials");

	const valid =
		await bcrypt.compare(
			password,
			user.password
		);

	if (!valid)
		throw new Error("Invalid credentials");

	const token =
		jwt.sign(
			{
				id: user.id,
				email: user.email
			},
			process.env.JWT_SECRET!,
			{
				expiresIn: "7d"
			}
		);

	return token;
}