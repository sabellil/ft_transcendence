import prisma from "../lib/prisma.js";//import de prisma pour parler a la bdd

export async function createOrganization(
	name: string,
	ownerId: number
)
{
	return await prisma.organization.create({//demande a prisma d'ajouteer une ligne dans la table Organization
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

export async function getOrganizationById(
	id: number
)
{
	return await prisma.organization.findUnique({//recup une ligne de la table Organization selon son id
		where: { id }
	});
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

export async function deleteOrganization(
	id: number
)
{
	return await prisma.organization.delete({
		where: { id }
	});	
}

export async function addUserToOrganization(
	organizationId: number,
	userId: number
)
{
	const existingMember = await prisma.organizationMember.findFirst({
		where:
		{
			organizationId,
			userId
		}
	});
	if (existingMember) {
		throw new Error("User already a member of this organization");
	}
	return await prisma.organizationMember.create({
		data:
		{
			organizationId,
			userId,
			role:"member"
		}
	});
}

export async function removeUserFromOrganization(
	organizationId:number,
	userId:number
)
{
	return await prisma.organizationMember.deleteMany({
		where:
		{
			organizationId,
			userId
		}
	});
}