// ---- imports ----

import { useState } from "react";
import "./guilds.scss";
import { useT } from "../../language.tsx";
import { guildNameSchema, usernameSchema, sanitizeUsername } from "../../validation.ts";
import type { GuildView, Profile, PendingGuild, Direction } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getGuildList, getDirectionalGuildRequests, createGuild, editGuild, deleteGuild, createGuildRequest, removeGuildRequest, acceptGuildRequest, deleteGuildship, promoteOwner, demoteOwner, leaveGuild } from "../../engine/guilds.ts";
import { useAbortableLoad } from "../../app.tsx";


// ---- component ----


function GuildList({ isGuest, profile }: { isGuest: boolean; profile: Profile }) {

	// ---- state ----

	const [guilds,     setGuilds]     = useState<GuildView[]>([]);
	const t = useT();

	const [name,       setName]       = useState("");
	const [error,      setError]      = useState("");
	const [success,    setSuccess]    = useState("");
	const [editTarget, setEditTarget] = useState<string | null>(null);
	const [editName,   setEditName]   = useState("");
	const [bannerFile, setBannerFile] = useState<File | null>(null);
	const [outgoing,   setOutgoing]   = useState<PendingGuild[]>([]);
	const [inviteName, setInviteName] = useState("");


	// ---- load data ----

	const load = async (signal?: AbortSignal) => {
		if (isGuest) {
			return;
		}
		try { const d = await getGuildList(); if (signal?.aborted) return; if (d) setGuilds(d); } catch {}
		try { const d = await getDirectionalGuildRequests("outgoing"); if (signal?.aborted) return; if (d) setOutgoing(d as PendingGuild[]); } catch {}
	};
	useAbortableLoad(load, [isGuest]);


	// ---- handlers ----


	async function handleCreate() {
		setError(""); setSuccess("");
		const result = guildNameSchema.safeParse(name);
		if (!result.success) {
			setError(result.error!.issues[0]!.message);
			return;
		}
		try {
			await createGuild(name.trim());
			setName("");
			setSuccess(t("success.guildCreated"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleEdit(guildName: string) {
		setError(""); setSuccess("");
		const result = guildNameSchema.safeParse(editName);
		if (!result.success) {
			setError(result.error!.issues[0]!.message);
			return;
		}
		try {
			await editGuild(guildName, { name: editName.trim(), bannerFile: bannerFile || undefined });
			setEditTarget(null);
			setEditName("");
			setBannerFile(null);
			setSuccess(t("success.guildUpdated"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleDelete(guildName: string) {
		setError(""); setSuccess("");
		try {
			await deleteGuild(guildName);
			setSuccess(t("success.guildDeleted"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleInvite(guildName: string) {
		setError(""); setSuccess("");
		const parsed = usernameSchema.safeParse(inviteName);
		if (!parsed.success) {
			setError(parsed.error.issues[0]!.message);
			return;
		}
		try {
			await createGuildRequest(guildName, inviteName.trim());
			setInviteName("");
			setSuccess(t("success.requestSent"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleJoin(guildName: string) {
		setError(""); setSuccess("");
		try {
			await createGuildRequest(guildName);
			setSuccess(t("success.requestSent"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleCancel(guildName: string, direction: Direction, username?: string) {
		setError(""); setSuccess("");
		try {
			await removeGuildRequest(guildName, direction, username);
			setSuccess(direction === "outgoing" ? t("success.requestCancelled") : t("success.guildRequestRefused"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleAccept(guildName: string, username: string) {
		setError(""); setSuccess("");
		try {
			await acceptGuildRequest(guildName, username);
			setSuccess(t("success.memberAccepted"));
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handlePromote(guildName: string, username: string) {
		setError(""); setSuccess("");
		try {
			await promoteOwner(guildName, username);
			setSuccess(`${username}${t("success.promotedToOwner")}`);
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleKick(guildName: string, username: string) {
		setError(""); setSuccess("");
		try {
			await deleteGuildship(guildName, username);
			setSuccess(`${username}${t("success.memberRemoved")}`);
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleDemote(guildName: string, username: string) {
		setError(""); setSuccess("");
		try {
			await demoteOwner(guildName, username);
			setSuccess(`${username}${t("success.steppedDown")}`);
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	async function handleLeave(guildName: string) {
		setError(""); setSuccess("");
		try {
			await leaveGuild(guildName);
			setSuccess(`${t("success.leftGuild")}${guildName}`);
			load();
		} catch (err: any) {
			setError(err.message);
		}
	}


	// ---- guest ----

	if (isGuest) {
		return (
			<div>
				<h2 className="guilds-title">{t("guilds.title")}</h2>
				<p>{t("guest.guilds")}</p>
			</div>
		);
	}


	// ---- render guild card ----


	function renderGuild(guild: GuildView) {
		const isOwner   = guild.owner.some(o => o.username === profile?.username);
		const myPending = guild.pending.find(p => p.username === profile?.username);
		const isMember  = guild.members.some(m => m.username === profile?.username);

		return (
			<div key={guild.name} className="guild-card">
				{editTarget === guild.name ? (<>
					<input className="edit-input" value={editName} onChange={e => setEditName(e.target.value)}
						onKeyDown={e => { if (e.key === "Enter") handleEdit(guild.name); if (e.key === "Escape") { setEditTarget(null); setEditName(""); setBannerFile(null); } }} />
					<div><input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} /></div>
					<div className="guild-actions">
						<button className="pill-btn" onClick={() => handleEdit(guild.name)}>{t("guilds.save")}</button>
						<button onClick={() => { setEditTarget(null); setEditName(""); setBannerFile(null); }}>{t("guilds.cancel")}</button>
					</div>
				</>) : (<>
					<img className="banner" src={assetUrl(guild.banner)} alt="" />
					<span className="guild-name">{guild.name}</span>
					{isOwner ? (<>
						<div className="guild-invite">
							<input placeholder={t("guilds.invitePlaceholder")} value={inviteName} onChange={e => setInviteName(e.target.value)}
								onKeyDown={e => { if (e.key === "Enter") handleInvite(guild.name); }} />
							<button className="pill-btn" onClick={() => handleInvite(guild.name)}>{t("guilds.invite")}</button>
						</div>
						<div className="guild-actions">
							<button className="pill-btn" onClick={() => { setEditTarget(guild.name); setEditName(guild.name); }}>{t("guilds.edit")}</button>
							<button className="delete-btn" onClick={() => handleDelete(guild.name)}>{t("guilds.delete")}</button>
						</div>
					</>) : myPending ? (
						myPending.guildStatus === "OwnerRequest" ? (
							<div className="guild-actions">
								<button className="pill-btn" onClick={() => handleAccept(guild.name, profile.username)}>{t("guilds.acceptInvite")}</button>
								<button className="pill-btn" onClick={() => handleCancel(guild.name, "outgoing")}>{t("guilds.refuse")}</button>
							</div>
						) : <button className="pill-btn" onClick={() => handleCancel(guild.name, "outgoing")}>{t("guilds.cancelRequest")}</button>
					) : !isMember ? (
						<button className="pill-btn" onClick={() => handleJoin(guild.name)}>{t("guilds.join")}</button>
					) : null}
				</>)}
				{isOwner && guild.pending.length > 0 && (
					<div className="tag-wrap">
						{guild.pending.map(pending => (
							<span key={pending.username} className="pending-tag">
								{pending.guildStatus === "OwnerRequest" ? `${sanitizeUsername(pending.username)} ${t("guilds.invited")}` : `${sanitizeUsername(pending.username)} ${t("guilds.wantsIn")}`}
								{pending.guildStatus !== "OwnerRequest" && <button onClick={() => handleAccept(guild.name, pending.username)}>✓</button>}
								<button onClick={() => handleCancel(guild.name, "incoming", pending.username)}>✗</button>
							</span>
						))}
					</div>
				)}
				<div className="tag-wrap">
					{guild.members.map(member => (
						<span key={member.username} className="member-tag">
							{sanitizeUsername(member.username)}
							{isOwner && member.username === profile?.username && <button onClick={() => handleDemote(guild.name, member.username)} title={t("guilds.stepDown")}>↓</button>}
							{member.username === profile?.username && !isOwner && <button onClick={() => handleLeave(guild.name)} title={t("guilds.leave")}>🚪</button>}
							{isOwner && member.username !== profile?.username && (<>
								{!guild.owner.some(o => o.username === member.username) && <button onClick={() => handlePromote(guild.name, member.username)} title={t("guilds.promote")}>👑</button>}
								{guild.owner.some(o => o.username === member.username) && <button onClick={() => handleDemote(guild.name, member.username)} title={t("guilds.stepDownTitle")}>↓</button>}
								<button onClick={() => handleKick(guild.name, member.username)} style={{ color: "#e88" }}>x</button>
							</>)}
						</span>
					))}
				</div>
			</div>
		);
	}


	// ---- render ----

	const myGuilds    = guilds.filter(g => g.members.some(m => m.username === profile?.username));
	const otherGuilds = guilds.filter(g => !g.members.some(m => m.username === profile?.username));

	return (
		<div>
			<h2 className="guilds-title">{t("guilds.title")}</h2>
			<div className="guilds-create">
				<input placeholder={t("guilds.guildNamePlaceholder")} value={name} onChange={e => setName(e.target.value)}
					onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
				<button onClick={handleCreate}>{t("guilds.create")}</button>
			</div>
		{error   && <p style={{ color: "#f48787" }}>{t(error)}</p>}
		{success && <p style={{ color: "#7ecb7e" }}>{t(success)}</p>}
			{outgoing.length > 0 && (
				<div style={{ marginBottom: "1rem" }}>
					<h3 style={{ color: "#343434", marginBottom: "0.5rem" }}>{t("guilds.outgoingRequests")}</h3>
					{outgoing.map(request => (
						<div key={request.name} className="outgoing-row">
							<span>{t("guilds.waitingFor")} {request.name}</span>
							<button onClick={() => handleCancel(request.name, "outgoing")}>{t("guilds.cancel")}</button>
						</div>
					))}
				</div>
			)}
			<div className="guilds-columns">
				<div className="guilds-col">
					<h3 className="guilds-col-title">{t("guilds.myGuilds")}</h3>
					{myGuilds.length === 0 && <p style={{ color: "#9a8fb8", fontStyle: "italic" }}>{t("guilds.noGuildsJoined")}</p>}
					{myGuilds.map(renderGuild)}
				</div>
				<div className="guilds-col">
					<h3 className="guilds-col-title">{t("guilds.discover")}</h3>
					{otherGuilds.length === 0 && <p style={{ color: "#9a8fb8", fontStyle: "italic" }}>{t("guilds.noGuildsToDiscover")}</p>}
					{otherGuilds.map(renderGuild)}
				</div>
			</div>
		</div>
	);
}


export default GuildList;
