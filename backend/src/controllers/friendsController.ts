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
	if (senderId === receiverId)
	{
		throw new Error("You cannot add yourself as a friend");
	}

	const existingFriendship =
		await prisma.friendship.findFirst({
			where:
			{
				OR:
				[
					{
						senderId,
						receiverId
					},
					{
						senderId: receiverId,
						receiverId: senderId
					}
				]
			}
		});

	if (existingFriendship)
	{
		throw new Error("Friendship already exists or you already have a pending invite from this user");
	}

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
	friendshipId: number,
	userId: number
)
{
	const friendship =
		await prisma.friendship.findUnique({
			where:
			{
				id: friendshipId
			}
		});

	if (!friendship || friendship.receiverId !== userId)//pas accepter de demande inexistante ou demande qui en ne nous est pas adressee
	{
		throw new Error("Friendship not found or not authorized");
	}
	if (friendship.status !== "pending")
	{
		throw new Error("Friendship is no longer pending");
	}
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

export async function refuseFriend(
	friendshipId: number,
	userId: number
)
{
	const friendship = await prisma.friendship.findUnique({
		where:
		{
			id: friendshipId
		}
	});

	if (!friendship || friendship.receiverId !== userId)//pas refuser de demande inexistante ou demande qui en ne nous est pas adressee
	{
		throw new Error("Friendship not found or not authorized");
	}
	if (friendship.status !== "pending")
	{
		throw new Error("Friendship is no longer pending");
	}
	return await prisma.friendship.update({
		where:
		{
			id: friendshipId
		},
		data:
		{
			status: "refused"
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

