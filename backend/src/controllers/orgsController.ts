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

export async function getOrganizations()
{
    return await prisma.organization.findMany();//recup toutes les lignes de la table Organization
}

export async function udpateOrganization(
	id: number,
	name: string
)
{
	return await prisma.organization.update({
		where: { id },
		data: { name }
	});	
}
