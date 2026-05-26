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