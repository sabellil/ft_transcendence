import { useState } from "react";
import "./friends.scss";
import { useT } from "../../language.tsx";
import { usernameSchema, sanitizeUsername } from "../../validation.ts";
import type { PublicUser, Direction } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getFriendList, getDirectionalFriendRequests, createFriendRequest, removeFriendRequest, acceptFriendRequest, deleteUsership } from "../../engine/friends.ts";
import { useAbortableLoad } from "../../app.tsx";



function FriendsList({ isGuest }: { isGuest: boolean }) {
	const t = useT();

	const [friends,    setFriends]    = useState<PublicUser[]>([]);
	const [incoming,   setIncoming]   = useState<PublicUser[]>([]);
	const [outgoing,   setOutgoing]   = useState<PublicUser[]>([]);
	const [friendName, setFriendName] = useState("");
	const [error,      setError]      = useState("");
	const [success,    setSuccess]    = useState("");


	const load = async (signal?: AbortSignal) => {
		if (isGuest) return;
		try { const d = await getFriendList(); if (signal?.aborted) return; if (d) setFriends(d); } catch {}
		try { const d = await getDirectionalFriendRequests("incoming"); if (signal?.aborted) return; if (d) setIncoming(d); } catch {}
		try { const d = await getDirectionalFriendRequests("outgoing"); if (signal?.aborted) return; if (d) setOutgoing(d); } catch {}
	};
	useAbortableLoad(load, [isGuest]);


	async function handleCreate() {
		setError(""); setSuccess("");
		const parsed = usernameSchema.safeParse(friendName);
		if (!parsed.success) { setError(parsed.error.issues[0]!.message); return; }
		try {
			await createFriendRequest(friendName.trim());
			setFriendName("");
			setSuccess(t("success.friendRequestSent"));
			load();
		} catch (err: any) { setError(err.message); }
	}

	async function handleAccept(username: string) {
		setError(""); setSuccess("");
		try {
			await acceptFriendRequest(username);
			setSuccess(`${username} ${t("success.friendAccepted")}`);
			load();
		} catch (err: any) { setError(err.message); }
	}

	async function handleRemove(username: string, direction: Direction) {
		setError(""); setSuccess("");
		try {
			await removeFriendRequest(username, direction);
			setSuccess(direction === "outgoing" ? t("success.requestCancelled") : t("success.requestRefused"));
			load();
		} catch (err: any) { setError(err.message); }
	}

	async function handleDelete(username: string) {
		setError(""); setSuccess("");
		try {
			await deleteUsership(username);
			setSuccess(`${username} ${t("success.friendRemoved")}`);
			load();
		} catch (err: any) { setError(err.message); }
	}


	if (isGuest) {
		return (
			<div className="friends-panel">
				<h2 className="friends-title">{t("nav.friends")}</h2>
				<p>{t("guest.friends")}</p>
			</div>
		);
	}


	return (
		<div className="friends-panel">
			<h2 className="friends-title">{t("nav.friends")}</h2>
			<div className="friends-add">
				<input type="text" placeholder={t("friends.addPlaceholder")} value={friendName}
					onChange={e => setFriendName(e.target.value)}
					onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
				<button onClick={handleCreate}>{t("friends.add")}</button>
			</div>
		{error   && <p style={{ color: "#f48787" }}>{t(error)}</p>}
		{success && <p style={{ color: "#7ecb7e" }}>{t(success)}</p>}

			{outgoing.length > 0 && (
				<div style={{ marginBottom: "1rem" }}>
					<h3 className="friends-section-title">{t("friends.outgoing")}</h3>
					{outgoing.map(friend => (
						<div key={friend.username} className="friend-row">
							<img src={assetUrl(friend.avatar)} alt="" />
							<span className="name">{sanitizeUsername(friend.username)}</span>
							<span className="sub">{t("friends.waiting")}</span>
							<button className="friend-action remove"
								onClick={() => handleRemove(friend.username, "outgoing")}>x</button>
						</div>
					))}
				</div>
			)}

			{incoming.length > 0 && (
				<div style={{ marginBottom: "1rem" }}>
					<h3 className="friends-section-title">{t("friends.incoming")}</h3>
					{incoming.map(friend => (
						<div key={friend.username} className="friend-row">
							<img src={assetUrl(friend.avatar)} alt="" />
							<span className="name">{sanitizeUsername(friend.username)}</span>
							<span className="sub">{t("friends.sentRequest")}</span>
							<button className="friend-action accept"
								onClick={() => handleAccept(friend.username)}>v</button>
							<button className="friend-action remove"
								onClick={() => handleRemove(friend.username, "incoming")}>x</button>
						</div>
					))}
				</div>
			)}

			{friends.map(friend => (
				<div key={friend.username} className="friend-row">
					<img src={assetUrl(friend.avatar)} alt="" />
					<span className="name">{sanitizeUsername(friend.username)}</span>
					<span className="sub">{friend.status === "Online" ? t("status.online") : t("status.offline")}</span>
					<button className="friend-action remove"
						onClick={() => handleDelete(friend.username)}>x</button>
				</div>
			))}
		</div>
	);
}


export default FriendsList;
