// API_BASE — empty = relative URLs, proxied by frontend SSR server to backend
export const API_BASE = "";





export const API_AUTH   = `${API_BASE}/api/auth`;


export const API_USER   = `${API_BASE}/api/user`;


export const API_FRIEND = `${API_BASE}/api/friend`;


export const API_BLOCK  = `${API_BASE}/api/block`;


export const API_GUILD  = `${API_BASE}/api/guild`;


export const API_CARD   = `${API_BASE}/api/card`;





// getStoredLang — read preferred language from localStorage
function getStoredLang(): string {
	// try read localStorage
	try { const lang = localStorage.getItem("app_lang"); if (lang === "fr") return "fr"; } catch {}
	return "en";
}





// authOpts — build fetch options with credentials, language, and optional JSON body
export function authOpts(opts: { json?: unknown; method?: string; headers?: Record<string, string> } = {}): RequestInit {
	const { json, method, headers: extraHeaders } = opts;
	const headers: Record<string, string> = { "Accept-Language": getStoredLang(), ...(extraHeaders || {}) };

	// json → add Content-Type and stringify body
	if (json !== undefined) {
		headers["Content-Type"] = "application/json";
		return { credentials: "include", headers, method: method || "POST", body: JSON.stringify(json) };
	}

	return { credentials: "include", headers, method };
}





// uploadMultipart — upload file with extra form fields
export function uploadMultipart(url: string, file: File, extraFields: Record<string, string> = {}, fileFieldName = "file") {
	const form = new FormData();
	form.append(fileFieldName, file);
	for (const [key, value] of Object.entries(extraFields)) { if (value) form.append(key, value); }
	return fetch(url, { credentials: "include", headers: { "Accept-Language": getStoredLang() }, method: "POST", body: form });
}





// apiGet — typed GET request that returns null on failure
export async function apiGet<T>(url: string): Promise<T | null> {
	const res = await fetch(url, authOpts() as RequestInit);
	if (!res.ok) return null;
	return res.json() as T;
}





// apiPost — typed POST request that throws on failure
export async function apiPost<T>(url: string, init?: RequestInit): Promise<T> {
	const base = authOpts({ method: "POST" }) as RequestInit;
	const res = await fetch(url, { ...base, ...init, headers: { ...(base.headers as any), ...(init?.headers as any || {}) } });
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Request failed");
	return data as T;
}





// assetUrl — resolve asset path to full URL with fallback
export function assetUrl(path: string): string {
	if (!path) return "/resource/proff.webp";
	// try parse as URL — if valid http/https, return as-is
	try { const u = new URL(path); if (u.protocol === "http:" || u.protocol === "https:") return path; } catch {}
	// relative path — prepend API_BASE after sanitizing segments
	return API_BASE + "/" + path.split("/").filter(s => s && s !== "..").join("/");
}
