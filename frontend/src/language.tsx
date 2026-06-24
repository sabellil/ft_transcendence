import { createContext, useContext, useState, useCallback, useEffect } from "react";


import type { ReactNode } from "react";


import type { Lang, Messages } from "./constants.ts";


import enDefault from "./language/en.json" with { type: "json" };





// detectLang — detect preferred language from localStorage, navigator, or default en
function detectLang(): Lang {
	// try localStorage preference
	try {
		const stored = localStorage.getItem("app_lang");
		// stored === "fr" → valid stored preference, use it
		if (stored === "fr") return "fr";
	// catch localStorage not available
	} catch {}

	// try navigator.language → detect browser language
	if (typeof navigator !== "undefined" && navigator.language) {
		// navigator.language starts with fr → browser set to French
		if (navigator.language.toLowerCase().startsWith("fr")) return "fr";
	}

	return "en";
}





// getMsg — resolve dotted path (e.g. "nav.friends") to translated string
function getMsg(_lang: Lang, messages: Messages, path: string): string {
	const keys = path.split(".");
	let cur: any = messages;
	for (const k of keys) {
		// cur[k] exists → descend into nested messages
		if (cur && typeof cur === "object" && k in cur) {
			cur = cur[k];
		// key not found → return raw path
		} else {
			return path;
		}
	}
	return typeof cur === "string" ? cur : path;
}





// LangCtx — React context holding current language and translation function
const LangCtx = createContext<{
	lang: Lang;
	t: (path: string) => string;
	setLang: (l: Lang) => void;
} | null>(null);





// I18nProvider — wrap app with language context for translations
export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(detectLang);
	const [messages, setMessages] = useState<Record<string, Messages>>({ en: enDefault, fr: enDefault as any });

	// useEffect — load French language file on mount
	useEffect(() => {
		(async () => {
			// try load French message bundle
			try {
				const fr = await import("./language/fr.json").then(m => m.default);
				setMessages(prev => ({ ...prev, fr }));
			// catch load failure → keep en only
			} catch {}
		})();
	}, []);

	const setLang = useCallback((l: Lang) => {
		setLangState(l);
		// try persist preference to localStorage
		try { localStorage.setItem("app_lang", l); } catch {}
	}, []);

	const t = useCallback(
		(path: string) => {
			const result = getMsg(lang, messages[lang] || {}, path);
			// key not found in current language → fallback to English
			if (result === path && lang !== "en") return getMsg("en", messages["en"] || {}, path);
			return result;
		},
		[lang, messages],
	);

	return (
		<LangCtx.Provider value={{ lang, t, setLang }}>
			{children}
		</LangCtx.Provider>
	);
}





// useT — return translation function bound to current language
export function useT() {
	const ctx = useContext(LangCtx);
	// !ctx → used outside I18nProvider
	if (!ctx) {
		throw new Error("useT must be used inside I18nProvider");
	}
	return ctx.t;
}





// useLang — return current language + setter
export function useLang() {
	const ctx = useContext(LangCtx);
	// !ctx → used outside I18nProvider
	if (!ctx) {
		throw new Error("useLang must be used inside I18nProvider");
	}
	return { lang: ctx.lang, setLang: ctx.setLang };
}





// StatusMessage — error + success alerts (props are translation keys or pre-translated strings)
export function StatusMessage({ error, success }: { error?: string; success?: string }) {
	const t = useT();

	return (
		<>


			{/* error → render error alert */}
			{error && (
				<p className="auth-error">
					{t(error)}
				</p>
			)}


			{/* success → render success alert */}
			{success && (
				<p className="auth-success">
					{t(success)}
				</p>
			)}


		</>
	);
}
