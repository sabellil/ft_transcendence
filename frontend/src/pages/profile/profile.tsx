import { useState } from "react";
import "./profile.scss";
import type { Profile, PublicUser } from "../../constants.ts";
import { editUser, deleteUser } from "../../engine/users.ts";
import { getBlockList, deleteBlock, createBlock } from "../../engine/friends.ts";
import { useT, useLang } from "../../language.tsx";
import { assetUrl } from "../../engine/api.ts";
import { usernameSchema, emailSchema, passwordSchema, sanitizeUsername } from "../../validation.ts";
import { useAbortableLoad } from "../../app.tsx";


interface Props {
	profile:         Profile;
	onProfileUpdate: (updated: Profile) => void;
	isGuest:         boolean;
}


function ProfilePage({ profile, onProfileUpdate, isGuest }: Props) {
	const t = useT();
	const { setLang } = useLang();

	const [profileError,   setProfileError]   = useState("");
	const [profileSuccess, setProfileSuccess] = useState("");
	const [editing,        setEditing]        = useState(false);
	const [username,       setUsername]       = useState("");
	const [email,          setEmail]          = useState("");
	const [password,       setPassword]       = useState("");
	const [avatarFile,     setAvatarFile]     = useState<File | null>(null);
	const [language,       setLanguage]       = useState(profile.language || "en");

	const [blocked,        setBlocked]        = useState<PublicUser[]>([]);
	const [loadingBlocked, setLoadingBlocked]  = useState(true);
	const [blockName,      setBlockName]      = useState("");
	const [blockError,     setBlockError]     = useState("");
	const [blockSuccess,   setBlockSuccess]   = useState("");


	const loadBlocked = async (signal?: AbortSignal) => {
		if (isGuest) { setLoadingBlocked(false); return; }
		try {
			const data = await getBlockList();
			if (signal?.aborted) return;
			if (data) setBlocked(data);
		} catch {} finally {
			if (!signal?.aborted) setLoadingBlocked(false);
		}
	};
	useAbortableLoad(loadBlocked, [isGuest]);


	async function handleUnblock(username: string) {
		setBlockError(""); setBlockSuccess("");
		try { await deleteBlock(username); setBlockSuccess(`${username}${t("success.userUnblocked")}`); loadBlocked(); }
		catch (err: any) { setBlockError(err.message); }
	}

	async function handleBlock() {
		setBlockError(""); setBlockSuccess("");
		const parsed = usernameSchema.safeParse(blockName);
		if (!parsed.success) { setBlockError(parsed.error.issues[0]!.message); return; }
		try { await createBlock(blockName.trim()); setBlockName(""); setBlockSuccess(`${blockName.trim()}${t("success.userBlocked")}`); loadBlocked(); }
		catch (err: any) { setBlockError(err.message); }
	}


	function handleStartEdit() { setProfileError(""); setProfileSuccess(""); setUsername(profile.username); setEmail(profile.email); setPassword(""); setAvatarFile(null); setLanguage(profile.language || "en"); setEditing(true); }
	function handleCancelEdit() { setEditing(false); setProfileError(""); setProfileSuccess(""); setAvatarFile(null); }

	async function handleSaveEdit() {
		setProfileError(""); setProfileSuccess("");
		if (username !== profile.username) { const r = usernameSchema.safeParse(username); if (!r.success) { setProfileError(r.error!.issues[0]!.message); return; } }
		if (email !== profile.email)       { const r = emailSchema.safeParse(email);       if (!r.success) { setProfileError(r.error!.issues[0]!.message); return; } }
		if (password)                       { const r = passwordSchema.safeParse(password); if (!r.success) { setProfileError(r.error!.issues[0]!.message); return; } }
		try {
			const updated = await editUser({
				username: username !== profile.username ? username : undefined,
				email:    email !== profile.email       ? email    : undefined,
				password: password || undefined,
				avatarFile: avatarFile || undefined,
				language: language !== profile.language ? language : undefined,
			});
			// also update language immediately in context
			if (language !== profile.language) {
				setLang(language as "en"|"fr");
			}
			onProfileUpdate(updated);
			setEditing(false); setAvatarFile(null);
			setProfileSuccess(t("success.profileUpdated"));
		} catch (err: any) { setProfileError(err.message); }
	}

	async function handleDeleteAccount() {
		if (!confirm(t("profile.confirmDelete"))) return;
		setProfileError(""); setProfileSuccess("");
		try { await deleteUser(); sessionStorage.removeItem("view"); window.location.reload(); }
		catch (err: any) { setProfileError(err.message); }
	}


	return (
		<div>
			<h2 className="profile-title">{t("profile.title")}</h2>
			<div className="profile-cols">
				<div className="profile-main">
					<h3 className="profile-section">{t("profile.editInfo")}</h3>
					{!isGuest && (
						<div className="profile-avatar">
							<img src={assetUrl(profile.avatar)} alt="" />
							{editing && <div><input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} /></div>}
						</div>
					)}
					{profileError   && <p style={{ color: "#f48787" }}>{t(profileError)}</p>}
					{profileSuccess && <p style={{ color: "#7ecb7e" }}>{t(profileSuccess)}</p>}
					{isGuest ? (
						<p>{t("guest.info")}</p>
					) : editing ? (<>
						<div className="profile-field"><strong>{t("profile.username")}:</strong><input value={username} onChange={e => setUsername(e.target.value)} /></div>
						<div className="profile-field"><strong>{t("profile.email")}:</strong><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
						<div className="profile-field"><strong>{t("profile.password")}:</strong><input type="password" placeholder={t("profile.passwordPlaceholder")} value={password} onChange={e => setPassword(e.target.value)} /></div>
						<div className="profile-field">
							<strong>{t("profile.language")}:</strong>
							<select value={language} onChange={e => setLanguage(e.target.value)}>
								<option value="en">English</option>
								<option value="fr">Français</option>
							</select>
						</div>
						<button className="profile-btn" onClick={handleSaveEdit}>{t("profile.save")}</button>
						<button className="profile-btn" style={{ background: "none", color: "#666" }} onClick={handleCancelEdit}>{t("profile.cancel")}</button>
					</>) : (<>
						<div className="profile-field-plain"><strong>{t("profile.email")}:</strong> {profile.email}</div>
						<div className="profile-field-plain"><strong>{t("profile.username")}:</strong> {sanitizeUsername(profile.username)}</div>
						<div className="profile-field-plain"><strong>{t("profile.language")}:</strong> {profile.language === "fr" ? "Français" : "English"}</div>
						<button className="profile-btn" onClick={handleStartEdit}>{t("profile.editProfile")}</button>
						<button className="profile-delete" onClick={handleDeleteAccount}>{t("profile.deleteAccount")}</button>
					</>)}
				</div>
				<div className="profile-side">
					<h3 className="profile-section">{t("profile.blockedUsers")}</h3>
					<div className="block-bar">
						<input placeholder={t("profile.blockPlaceholder")} value={blockName} onChange={e => setBlockName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleBlock(); }} />
						<button onClick={handleBlock}>{t("profile.block")}</button>
					</div>
					{blockError   && <p style={{ color: "#f48787" }}>{t(blockError)}</p>}
					{blockSuccess && <p style={{ color: "#7ecb7e" }}>{t(blockSuccess)}</p>}
					{loadingBlocked ? (
						<p style={{ color: "#9a8fb8", fontStyle: "italic" }}>{t("status.loading")}</p>
					) : blocked.length === 0 ? (
						<p style={{ color: "#9a8fb8", fontStyle: "italic" }}>{t("profile.noBlocked")}</p>
					) : (
						blocked.map(user => (
							<div key={user.username} className="blocked-row">
								<span>{user.username}</span>
								<button onClick={() => handleUnblock(user.username)}>{t("profile.unblock")}</button>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}


export default ProfilePage;
