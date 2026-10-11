import type { APIRoute } from "astro";

const SCOPE = "repo,user";

export const GET: APIRoute = async ({ url, redirect }) => {
	const CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
	const CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;

	if (!CLIENT_ID || !CLIENT_SECRET) {
		return new Response("Missing GitHub OAuth credentials (set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env)", { status: 500 });
	}

	const code = url.searchParams.get("code");

	if (!code) {
		const authUrl = new URL("https://github.com/login/oauth/authorize");
		authUrl.searchParams.set("client_id", CLIENT_ID);
		authUrl.searchParams.set("scope", SCOPE);
		authUrl.searchParams.set("redirect_uri", `${url.origin}/api/auth`);
		return redirect(authUrl.toString());
	}

	const res = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
	});

	const data = await res.json();

	if (data.error) {
		return new Response(data.error_description || data.error, { status: 400 });
	}

	// Decap CMS OAuth handshake (see decap-cms-app handshakeCallback / authorizeCallback):
	// 1. Popup sends "authorizing:github" to opener
	// 2. Opener echoes it back to popup
	// 3. Popup sends "authorization:github:success:{...}" to opener
	const successPayload = JSON.stringify({ token: data.access_token, provider: "github" });
	const successMsg = `authorization:github:success:${successPayload}`;

	return new Response(
		`<!doctype html><html><body><script>
(function() {
	 if (!window.opener) { document.body.innerText = "Error: no opener"; return; }
	 // Step 1 — send handshake, wait for echo, then send success
	 function onMessage(e) {
	   if (e.data === "authorizing:github") {
	     window.removeEventListener("message", onMessage, false);
	     window.opener.postMessage(${JSON.stringify(successMsg)}, "*");
	     setTimeout(function() { window.close(); }, 500);
	   }
	 }
	 window.addEventListener("message", onMessage, false);
	 window.opener.postMessage("authorizing:github", "*");
})();
<\/script></body></html>`,
		{ status: 200, headers: { "Content-Type": "text/html" } },
	);
};
