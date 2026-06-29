import { StrictMode, Component, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Profile } from "./constants.ts";
import { I18nProvider, useT, useLang } from "./language.tsx";





// ---- hook ----

export function useAbortableLoad(loadFn: (signal?: AbortSignal) => void, deps: React.DependencyList): void {
	const load = useCallback(loadFn, deps);
	useEffect(() => {
		const ctrl = new AbortController();
		load(ctrl.signal);
		return () => ctrl.abort();
	}, [load]);
}





// ---- browser entry ----

import("./app.scss");
(async () => {
	const [
		{ getUser }, { logoutUser }, { API_USER, assetUrl, API_CARD },
		{ sanitizeUsername },
		{ default: AuthForm }, { default: FriendsList }, { default: GuildList },
		{ default: MessagePage }, { default: ProfilePage }, { default: ErrorPage }, { default: LegalPage },
	] = await Promise.all([
		import("./engine/users.ts"), import("./engine/auth.ts"), import("./engine/api.ts"),
		import("./validation.ts"),
		import("./pages/auth/auth.tsx"), import("./pages/friends/friends.tsx"),
		import("./pages/guilds/guilds.tsx"), import("./pages/message/message.tsx"),
		import("./pages/profile/profile.tsx"), import("./pages/error/error.tsx"),
		import("./pages/legal/legal.tsx"),
	]);





	// ---- error boundary ----

	class ErrorBoundary extends Component<{ children: ReactNode }> {
		state = { error: false };
		componentDidCatch() { this.setState({ error: true }); }
		render() { return this.state.error ? <ErrorPage onRetry={() => this.setState({ error: false })} /> : this.props.children as any; }
	}





	// ---- app ----

	type View = "friends" | "guilds" | "message" | "profile";


	function App() {

		const t = useT();
		const { setLang } = useLang();

		// ---- state ----

		const [profile,   setProfile]   = useState<Profile | null>(null);
		const [loading,   setLoading]   = useState(true);
		const [isGuest,   setIsGuest]   = useState(false);
		const [view,      setView]      = useState<View>("friends");
		const [error,     setError]     = useState(false);
		const [showLegal, setShowLegal] = useState(false);


		// ---- load profile ----

		useEffect(() => {
			const ctrl = new AbortController();
			(async () => {
				try {
					const r = await fetch(API_USER, { credentials: "include", signal: ctrl.signal });
					if (r.ok && !ctrl.signal.aborted) setProfile(await r.json());
				} catch {
					// network error — ignore, show guest state
					if (!ctrl.signal.aborted) setError(true);
				}
				if (!ctrl.signal.aborted) setLoading(false);
			})();
			return () => ctrl.abort();
		}, []);


		// ---- sync profile language ----

		useEffect(() => {
			if (profile?.language && (profile.language === "en" || profile.language === "fr")) {
				setLang(profile.language);
			}
		}, [profile?.language, setLang]);

		// ---- restore view ----

		useEffect(() => {
			const s = sessionStorage.getItem("view") as View | null;
			if (s && ["friends", "guilds", "message", "profile"].includes(s)) setView(s);
		}, []);


		// ---- auth handlers ----

		const handleLogin  = useCallback(async (_token?: string) => { setIsGuest(false); const p = await getUser(); if (p) setProfile(p); }, []);
		const handleLogout = useCallback(async () => {
			await logoutUser().catch(() => {});
			sessionStorage.removeItem("view");
			setProfile(null);
			setIsGuest(false);
		}, []);

		function handleGuest() { setIsGuest(true); setProfile({ email: "", username: "Guest", avatar: "", status: "Offline", language: "en" }); }


		// ---- navigation ----

		const nav = (v: View) => { setView(v); sessionStorage.setItem("view", v); };


		// ---- loading / error ----

		if (error)   return <ErrorPage onRetry={() => setError(false)} />;
		if (loading) {
			return <p style={{ color: "#fff" }}>{t("status.loading")}</p>;
		}


		// ---- logged in ----

		if (profile) {
			return (
				<div className="main-layout">
					<div className="logout-corner" onClick={handleLogout}><span>{isGuest ? t("auth.guestExit") : t("auth.logout")}</span></div>
					<div className="nav-bar">
						<div className="nav-inner">
							<button className="nav-btn" onClick={() => nav("friends")}>{t("nav.friends")}</button>
							<button className="nav-btn" onClick={() => nav("message")}>{t("nav.messages")}</button>
							<button className="nav-btn" onClick={() => nav("guilds")}>{t("nav.guilds")}</button>
							<div className="profile-corner" onClick={() => nav("profile")}>
								<span className="profile-name">{sanitizeUsername(profile.username)}</span>
								<div className="profile-pic" style={{ backgroundImage: `url(${assetUrl(profile.avatar)})` }} />
							</div>
						</div>
					</div>
					<div className="home-panel">
						{view === "friends" && (<>
							<FriendsList isGuest={isGuest} />
							<div className="content-area">
									<CardGrid />
								</div>
							<button className="wish-btn">🤍</button>
							<button className="add-btn">+</button>
						</>)}
						{view === "message" && <div className="content-area"><MessagePage isGuest={isGuest} /></div>}
						{view === "guilds" && <div className="content-area"><GuildList isGuest={isGuest} profile={profile} /></div>}
						{view === "profile" && <div className="content-area"><ProfilePage profile={profile} onProfileUpdate={setProfile} isGuest={isGuest} /></div>}
					</div>
					<div className="legal-footer">
						<button onClick={() => setShowLegal(true)}>{t("legal.privacyPolicy")}</button>
						<span>·</span>
						<button onClick={() => setShowLegal(true)}>{t("legal.termsOfService")}</button>
					</div>
					{showLegal && <LegalPage onClose={() => setShowLegal(false)} />}
				</div>
			);
		}


		// ---- login page ----

		return (<>
			<AuthForm onLogin={handleLogin} onGuestEnter={handleGuest} onLegalClick={() => setShowLegal(true)} />
			{showLegal && <LegalPage onClose={() => setShowLegal(false)} />}
		</>);
	}

	// CardGrid — standalone component (outside App to avoid remounts on state change)
	function CardGrid() {
		const [cards, setCards] = useState([]);
		useEffect(() => {
			fetch(API_CARD).then(r => r.ok ? r.json() : []).then(setCards).catch(() => {});
		}, []);
		return cards.map((c: any) => (
			<img key={c.name} className="card-img" src={assetUrl(c.image)} alt={c.name} title={c.name} />
		));
	}





	// ---- mount ----

	

			createRoot(document.getElementById("root")!).render(<StrictMode><ErrorBoundary><I18nProvider><App /></I18nProvider></ErrorBoundary></StrictMode>);
})();
