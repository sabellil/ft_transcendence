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