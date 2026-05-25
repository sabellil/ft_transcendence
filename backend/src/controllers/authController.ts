import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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