import { API_AUTH, authOpts } from "./api.ts";










// loginUser — send login request and return JWT token
export async function loginUser(username: string, password: string) {
	const res = await fetch(API_AUTH + "/login", authOpts({ json: { username, password } }));
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.loginFailed");
	return data;
}





// registerUser — create new user account
export async function registerUser(email: string, username: string, password: string) {
	const res = await fetch(API_AUTH + "/register", authOpts({ json: { email, username, password } }));
	const data = await res.json();
	// !res.ok → throw registration error
	if (!res.ok) throw new Error(data.error || "error.registrationFailed");
	return data;
}





// logoutUser — call logout endpoint to clear server-side session
export async function logoutUser() {
	const res = await fetch(API_AUTH + "/logout", authOpts({ method: "POST" }));
	const data = await res.json();
	// !res.ok → throw logout error
	if (!res.ok) throw new Error(data.error || "error.logoutFailed");
	return data;
}
