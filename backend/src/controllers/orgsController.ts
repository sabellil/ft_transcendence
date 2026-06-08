import prisma from "../lib/prisma.js";

export async function createOrganization(
	name: string,
	ownerId: number
)
{
	return await prisma.organization.create({
		data:
		{
			name,
			ownerId
		}
	});
}

export async function getOrganization()
{
    return await prisma.organization.findMany();
}