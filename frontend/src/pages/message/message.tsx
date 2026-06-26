import { useState } from "react";
import "./message.scss";
import { useT } from "../../language.tsx";
import { sanitizeUsername, sanitize } from "../../validation.ts";
import type { PublicUser } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getFriendList } from "../../engine/friends.ts";
import { getConversation, createMessage, type ChatMessage } from "../../engine/message.ts";
import { useAbortableLoad } from "../../app.tsx";

function MessagePage() {
	const t = useT();

	/* ============================
	 * Component state
	 * ============================ */

	// List of all user's friends
	const [friends, setFriends] = useState<PublicUser[]>([]);

	// Currently selected friend (current conversation)
	const [selected, setSelected] = useState<PublicUser | null>(null);

	// Messages of the current conversation
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	// Current input field content
	const [content, setContent] = useState("");

	// Error message displayed to the user
	const [error, setError] = useState("");

	/* ============================
	 * Initial loading
	 * ============================ */

	// Load the friend list when the page opens.
	// The AbortSignal prevents updating the state if the component unmounts.
	const load = async (signal?: AbortSignal) => {
		try {
			const d = await getFriendList("");

			if (signal?.aborted)
				return;

			if (d)
				setFriends(d);
		} catch {
			// Ignore loading errors
		}
	};

	useAbortableLoad(load, []);

	/* ============================
	 * Conversation management
	 * ============================ */

	// Called when the user selects a friend.
	// Loads the conversation history with that friend.
	async function handleSelect(friend: PublicUser) {
		setError("");
		setSelected(friend);

		try {
			const d = await getConversation(friend.username);

			if (d)
				setMessages(d);
		} catch (err: any) {
			setError(err.message);
		}
	}

	/* ============================
	 * Sending messages
	 * ============================ */

	// Send the current message to the selected friend.
	async function handleSend() {
		if (!selected)
			return;

		// Remove unwanted characters / whitespace.
		const clean = sanitize(content);

		// Ignore empty messages.
		if (!clean)
			return;

		setError("");

		try {
			const msg = await createMessage(selected.username, clean);

			// Append the new message without reloading
			// the whole conversation.
			setMessages(prev => [...prev, msg]);

			// Clear the input field.
			setContent("");
		} catch (err: any) {
			setError(err.message);
		}
	}

	/* ============================
	 * Rendering
	 * ============================ */

	return (
		<div className="message-panel">
			<h2 className="message-title">Mes</h2>

			<div className="message-layout">

				{/* ---------- Friend list ---------- */}
				<div className="message-friends">
					<h3>{t("nav.friends")}</h3>

					{friends.map(friend => (
						<button
							key={friend.username}
							className="message-friend-row"
							onClick={() => handleSelect(friend)}
						>
							<img src={assetUrl(friend.avatar)} alt="" />

							<span className="name">
								{sanitizeUsername(friend.username)}
							</span>

							<span className="sub">
								{friend.status === "Online"
									? t("status.online")
									: t("status.offline")}
							</span>
						</button>
					))}
				</div>

				{/* ---------- Current conversation ---------- */}
				<div className="message-chat">
					{selected ? (
						<>
							{/* Conversation header */}
							<div className="message-header">
								<img src={assetUrl(selected.avatar)} alt="" />
								<h3>{sanitizeUsername(selected.username)}</h3>
							</div>

							{/* Conversation history */}
							<div className="message-list">
								{messages.map(message => (
									<div key={message.id} className="message-item">
										<p>
											<strong>
												{sanitizeUsername(message.username)}:
											</strong>{" "}
											{message.content}
										</p>

										<span>
											{new Date(message.time).toLocaleString()}
										</span>
									</div>
								))}
							</div>

							{/* Message composer */}
							<div className="message-send">
								<input
									type="text"
									value={content}
									placeholder="Message..."
									onChange={e => setContent(e.target.value)}
									onKeyDown={e => {
										if (e.key === "Enter")
											handleSend();
									}}
								/>

								<button onClick={handleSend}>
									Send
								</button>
							</div>
						</>
					) : (
						// No conversation selected yet
						<p>Select a friend</p>
					)}
				</div>
			</div>

			{/* Display API errors */}
			{error && (
				<p style={{ color: "#f48787" }}>
					{t(error)}
				</p>
			)}
		</div>
	);
}

export default MessagePage;