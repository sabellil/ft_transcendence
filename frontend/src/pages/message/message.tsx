import { useState } from "react";
import "./message.scss";
import { useT } from "../../language.tsx";
import { sanitizeUsername, sanitize } from "../../validation.ts";
import type { PublicUser } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getFriendList } from "../../engine/friends.ts";
import { getConversation, createMessage, type ChatMessage } from "../../engine/message.ts";
import { useAbortableLoad } from "../../app.tsx";

function MessagePage({ isGuest }: { isGuest: boolean }) {
	const t = useT();

	const [friends, setFriends] = useState<PublicUser[]>([]);
	const [selected, setSelected] = useState<PublicUser | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [content, setContent] = useState("");
	const [error, setError] = useState("");

	const load = async (signal?: AbortSignal) => {
		if (isGuest) return;
		try {
			const d = await getFriendList("");
			if (signal?.aborted) return;
			if (d) setFriends(d);
		} catch {}
	};

	useAbortableLoad(load, [isGuest]);

	async function handleSelect(friend: PublicUser) {
		setError("");
		setSelected(friend);

		try {
			const d = await getConversation(friend.username);
			if (d) setMessages(d);
		} catch (err: any) {
			setError(err.message);
		}
	}

	async function handleSend() {
		if (!selected) return;

		const clean = sanitize(content);
		if (!clean) return;

		setError("");

		try {
			const msg = await createMessage(selected.username, clean);
			setMessages(prev => [...prev, msg]);
			setContent("");
		} catch (err: any) {
			setError(err.message);
		}
	}

	if (isGuest) {
		return (
			<div className="message-panel">
				<h2 className="message-title">Mes</h2>
				<p>{t("guest.message")}</p>
			</div>
		);
	}

	return (
		<div className="message-panel">
			<h2 className="message-title">Mes</h2>

			<div className="message-layout">
				<div className="message-friends">
					<h3>{t("nav.friends")}</h3>

					{friends.map(friend => (
						<button
							key={friend.username}
							className="message-friend-row"
							onClick={() => handleSelect(friend)}
						>
							<img src={assetUrl(friend.avatar)} alt="" />
							<span className="name">{sanitizeUsername(friend.username)}</span>
							<span className="sub">
								{friend.status === "Online" ? t("status.online") : t("status.offline")}
							</span>
						</button>
					))}
				</div>

				<div className="message-chat">
					{selected ? (
						<>
							<div className="message-header">
								<img src={assetUrl(selected.avatar)} alt="" />
								<h3>{sanitizeUsername(selected.username)}</h3>
							</div>

							<div className="message-list">
								{messages.map(message => (
									<div key={message.id} className="message-item">
										<p>
											<strong>{sanitizeUsername(message.username)}:</strong> {message.content}
										</p>
										<span>{new Date(message.time).toLocaleString()}</span>
									</div>
								))}
									</div>

							<div className="message-send">
								<input
									type="text"
									value={content}
									placeholder="Message..."
									onChange={e => setContent(e.target.value)}
									onKeyDown={e => {
										if (e.key === "Enter") handleSend();
									}}
								/>
								<button onClick={handleSend}>Send</button>
							</div>
						</>
					) : (
						<p>Select a friend</p>
					)}
				</div>
			</div>

			{error && <p style={{ color: "#f48787" }}>{t(error)}</p>}
		</div>
	);
}

export default MessagePage;