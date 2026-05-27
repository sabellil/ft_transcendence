import prisma from "../lib/prisma.js";

export async function getFriends(
	userId: number
)
{
	const friends =
		await prisma.friendship.findMany({
			where:
			{
				status: "accepted",
				OR:
				[
					{
						senderId: userId
					},
					{
						receiverId: userId
					}
				]
			}
		});

	return friends;
}

export async function addFriend(
	senderId: number,
	receiverId: number
)
{
	return await prisma.friendship.create({
		data:
		{
			senderId,
			receiverId,
			status: "pending"
		}
	});
}

export async function getPendingFriends(
	userId: number
)
{
	return await prisma.friendship.findMany({
		where:
		{
			receiverId: userId,
			status: "pending"
		}
	});
}

export async function acceptFriend(
	friendshipId: number
)
{
	return await prisma.friendship.update({
		where:
		{
			id: friendshipId
		},
		data:
		{
			status: "accepted"
		}
	});
}

export async function removeFriend(
	friendshipId:number
)
{
	return await prisma.friendship.delete({
		where:
		{
			id: friendshipId
		}
	});
}

