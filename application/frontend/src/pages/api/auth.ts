import type { APIRoute } from 'astro';

const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;

export const GET: APIRoute = async ({ url, redirect }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		// Step 1: Redirect to GitHub OAuth
		const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
		githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
		githubAuthUrl.searchParams.set('scope', 'repo,user');
		githubAuthUrl.searchParams.set(
			'redirect_uri',
			`${url.origin}/api/auth`,
		);

		return redirect(githubAuthUrl.toString());
	}

	// Step 2: Exchange code for access token
	try {
		const tokenResponse = await fetch(
			'https://github.com/login/oauth/access_token',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					client_id: GITHUB_CLIENT_ID,
					client_secret: GITHUB_CLIENT_SECRET,
					code,
				}),
			},
		);

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			throw new Error(tokenData.error_description || tokenData.error);
		}

		// Step 3: Return token to Decap CMS
		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Authorization Complete</title>
</head>
<body>
	<script>
		(function() {
			function receiveMessage(e) {
				console.log("receiveMessage", e);
				window.opener.postMessage(
					'authorization:github:success:${JSON.stringify(tokenData)}',
					e.origin
				);
				window.removeEventListener("message", receiveMessage, false);
			}
			window.addEventListener("message", receiveMessage, false);
			console.log("Sending message:", ${JSON.stringify(tokenData)});
			window.opener.postMessage(
				'authorization:github:success:${JSON.stringify(tokenData)}',
				"*"
			);
		})();
	</script>
</body>
</html>
		`;

		return new Response(html, {
			status: 200,
			headers: {
				'Content-Type': 'text/html',
			},
		});
	} catch (error) {
		return new Response(
			`OAuth Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ status: 500 },
		);
	}
};
