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

	// Decap CMS expects this exact postMessage string format to complete the OAuth flow.
	// Build the entire payload server-side so no browser-side eval is needed.
	const payload = JSON.stringify({ token: data.access_token, provider: "github" });
	const message = `authorization:github:success:${payload}`;

	return new Response(
		`<!doctype html><html><body><script>
(function() {
  var msg = ${JSON.stringify(message)};
  if (window.opener) {
    window.opener.postMessage(msg, "*");
  }
  setTimeout(function() { window.close(); }, 500);
})();
<\/script></body></html>`,
		{ status: 200, headers: { "Content-Type": "text/html" } },
	);
};
