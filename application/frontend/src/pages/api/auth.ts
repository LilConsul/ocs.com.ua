import type { APIRoute } from 'astro';

const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;

export const GET: APIRoute = async ({ url, redirect }) => {
	const code = url.searchParams.get('code');

	// Debug: Check if env vars are loaded
	if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
		return new Response(
			`Configuration Error: Missing GitHub credentials. CLIENT_ID exists: ${!!GITHUB_CLIENT_ID}, CLIENT_SECRET exists: ${!!GITHUB_CLIENT_SECRET}`,
			{ status: 500 }
		);
	}

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
		// Decap expects the message format: "authorization:github:success:{token:...}"
		const messageData = {
			token: tokenData.access_token,
			provider: 'github'
		};

		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Authorization Complete</title>
</head>
<body>
	<p>Authorization successful! This window should close automatically...</p>
	<script>
		(function() {
			var data = ${JSON.stringify(messageData)};
			console.log("Sending auth data:", data);

			// Decap CMS expects this exact format
			var message = "authorization:github:success:" + JSON.stringify(data);
			console.log("Message:", message);

			// Send to opener
			if (window.opener) {
				window.opener.postMessage(message, "*");
				console.log("Message sent to opener");

				// Close after a delay
				setTimeout(function() {
					console.log("Closing window...");
					window.close();
				}, 1000);
			} else {
				console.error("No window.opener found!");
			}
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
