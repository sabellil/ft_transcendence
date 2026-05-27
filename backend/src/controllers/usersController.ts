import prisma from "../lib/prisma.js";

export async function updateMe(
	userId:number,
	username:string
)

{
	return await prisma.user.update({
		where:
		{
			id:userId
		},
		data:
		{
			username
		},
		select:
		{
			id:true,
			email:true,
			username:true,
		}
	});
}

export async function getMe(
	userId:number
)
{
	return await prisma.user.findUnique({
		where:
		{
			id:userId
		},
		select:
		{
			id:true,
			email:true,
			username:true,
			isOnline:true

		}
	});
}