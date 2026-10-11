import type { APIRoute } from "astro";

const CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;
const SCOPE = "repo,user";

export const GET: APIRoute = async ({ url, redirect }) => {
	if (!CLIENT_ID || !CLIENT_SECRET) {
		return new Response("Missing GitHub OAuth credentials", { status: 500 });
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

	// Decap CMS expects this postMessage format to complete the OAuth flow
	return new Response(
		`<!doctype html><html><body><script>
window.opener?.postMessage(
  "authorization:github:success:" + JSON.stringify({ token: "${data.access_token}", provider: "github" }),
  "*"
);
setTimeout(() => window.close(), 500);
<\/script></body></html>`,
		{ status: 200, headers: { "Content-Type": "text/html" } },
	);
};
