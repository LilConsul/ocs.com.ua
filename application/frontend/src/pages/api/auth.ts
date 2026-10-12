import {
	GITHUB_CLIENT_ID as CLIENT_ID,
	GITHUB_CLIENT_SECRET as CLIENT_SECRET,
	SITE_URL,
} from "astro:env/server";
import type { APIRoute } from "astro";

// Holds the client secret and exchanges tokens per request, so it must run on the server
export const prerender = false;

const SCOPE = "repo,user";
const STATE_COOKIE = "decap_oauth_state";

const text = (body: string, status: number) =>
	new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
	const code = url.searchParams.get("code");
	const oauthError = url.searchParams.get("error");

	// The user denied access on GitHub (avoids redirecting back into the login again)
	if (oauthError) {
		return text(url.searchParams.get("error_description") || oauthError, 400);
	}

	if (!code) {
		const state = crypto.randomUUID();
		cookies.set(STATE_COOKIE, state, {
			httpOnly: true,
			sameSite: "lax",
			secure: url.protocol === "https:",
			path: "/api/auth",
			maxAge: 600,
		});

		const authUrl = new URL("https://github.com/login/oauth/authorize");
		authUrl.searchParams.set("client_id", CLIENT_ID);
		authUrl.searchParams.set("scope", SCOPE);
		authUrl.searchParams.set("redirect_uri", `${url.origin}/api/auth`);
		authUrl.searchParams.set("state", state);
		return redirect(authUrl.toString());
	}

	// Reject callbacks that did not start from this browser (login CSRF)
	const expectedState = cookies.get(STATE_COOKIE)?.value;
	cookies.delete(STATE_COOKIE, { path: "/api/auth" });
	if (!expectedState || expectedState !== url.searchParams.get("state")) {
		return text("Invalid OAuth state", 400);
	}

	let data: { access_token?: string; error?: string; error_description?: string };
	try {
		const res = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
		});
		if (!res.ok) return text(`GitHub token exchange failed (${res.status})`, 502);
		data = await res.json();
	} catch {
		return text("Could not reach GitHub", 502);
	}

	// GitHub answers 200 with { error } for a bad or expired code
	const { access_token, error, error_description } = data;
	if (error || !access_token) {
		return text(error_description || error || "No access token returned", 400);
	}

	// Only these origins may receive the token: the host serving this endpoint
	// (dev, or an admin on the same host) and the public site.
	const allowedOrigins = [...new Set([url.origin, new URL(SITE_URL).origin])];

	// Decap CMS OAuth handshake (see decap-cms-app handshakeCallback / authorizeCallback):
	// 1. Popup sends "authorizing:github" to opener
	// 2. Opener echoes it back to popup
	// 3. Popup sends "authorization:github:success:{...}" to opener (only to an allowed origin)
	const successMsg = `authorization:github:success:${JSON.stringify({ token: access_token, provider: "github" })}`;

	return new Response(
		`<!doctype html><html><body><script>
(function() {
	var allowedOrigins = ${inlineJson(allowedOrigins)};
	var successMsg = ${inlineJson(successMsg)};
	if (!window.opener) { document.body.innerText = "Error: no opener"; return; }
	function onMessage(e) {
		if (e.data !== "authorizing:github") return;
		if (allowedOrigins.indexOf(e.origin) === -1) return;
		window.removeEventListener("message", onMessage, false);
		window.opener.postMessage(successMsg, e.origin);
		setTimeout(function() { window.close(); }, 500);
	}
	window.addEventListener("message", onMessage, false);
	// Handshake carries no secret, so "*" is fine here
	window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`,
		{
			status: 200,
			headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
		}
	);
};
