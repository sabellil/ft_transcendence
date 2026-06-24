import { useState } from "react";
import "./auth.scss";
import { useT } from "../../language.tsx";
import { createUser } from "../../engine/users.ts";
import { loginUser } from "../../engine/auth.ts";
import { usernameSchema, passwordSchema, emailSchema } from "../../validation.ts";


interface Props {
	onLogin:      (token: string) => void;
	onGuestEnter: () => void;
	onLegalClick: () => void;
}


function AuthForm({ onLogin, onGuestEnter, onLegalClick }: Props) {
	const t = useT();

	const [email,        setEmail]        = useState("");
	const [password,     setPassword]     = useState("");
	const [username,     setUsername]     = useState("");
	const [showRegister, setShowRegister] = useState(false);
	const [error,        setError]        = useState("");
	const [success,      setSuccess]      = useState("");


	async function handleRegister() {
		setError("");
		setSuccess("");
		let result = emailSchema.safeParse(email);
		if (!result.success) { setError(result.error!.issues[0]!.message); return; }
		result = usernameSchema.safeParse(username);
		if (!result.success) { setError(result.error!.issues[0]!.message); return; }
		result = passwordSchema.safeParse(password);
		if (!result.success) { setError(result.error!.issues[0]!.message); return; }
		try {
			await createUser(email, username, password);
			setShowRegister(false);
			setPassword("");
			setSuccess(t("success.registrationComplete"));
		} catch (err: any) { setError(err.message); }
	}


	async function handleLogin() {
		setError("");
		setSuccess("");
		let result = usernameSchema.safeParse(username);
		if (!result.success) { setError(result.error!.issues[0]!.message); return; }
		result = passwordSchema.safeParse(password);
		if (!result.success) { setError(result.error!.issues[0]!.message); return; }
		try {
			const data = await loginUser(username, password);
			await onLogin(data.token);
		} catch (err: any) { setError(err.message); }
	}


	function toggle() { setShowRegister(!showRegister); setError(""); setSuccess(""); }

	function onKey(event: React.KeyboardEvent) {
		if (event.key !== "Enter") return;
		event.preventDefault();
		showRegister ? handleRegister() : handleLogin();
	}


	return (
		<div>
			<div className="auth-page">
				<button className="auth-guest" onClick={onGuestEnter}>{t("auth.guestEnter")}</button>
				<img className="auth-logo" src="/resource/proff.webp" alt="" />
				<div className="auth-fields" onKeyDown={onKey}>
					<input className="auth-input" type="text" placeholder={t("auth.username")}
						value={username} onChange={e => setUsername(e.target.value)} />
					{showRegister && (
						<input className="auth-input" type="email" placeholder={t("auth.email")}
							value={email} onChange={e => setEmail(e.target.value)} />
					)}
					<input className="auth-input" type="password" placeholder={t("auth.password")}
						value={password} onChange={e => setPassword(e.target.value)} />
				{error   && <p className="auth-error">{t(error)}</p>}
				{success && <p className="auth-success">{t(success)}</p>}
					{showRegister ? (<>
						<button className="auth-btn" onClick={handleRegister}>{t("auth.register")}</button>
						<button className="auth-link" onClick={toggle}>{t("auth.hasAccount")}</button>
					</>) : (<>
						<button className="auth-btn" onClick={handleLogin}>{t("auth.login")}</button>
						<button className="auth-link" onClick={toggle}>{t("auth.noAccount")}</button>
					</>)}
				</div>
				<div className="auth-footer">
					<button onClick={onLegalClick}>{t("legal.privacyPolicy")}</button>
					<span>·</span>
					<button onClick={onLegalClick}>{t("legal.termsOfService")}</button>
				</div>
			</div>
		</div>
	);
}


export default AuthForm;
