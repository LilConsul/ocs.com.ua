import type { APIRoute } from "astro";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;
const NEXTAUTH_SECRET = import.meta.env.NEXTAUTH_SECRET;

if (!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)) {
	console.warn(
		"[TinaCMS Auth] Missing GitHub OAuth credentials. Authentication will not work.",
	);
}

if (!NEXTAUTH_SECRET) {
	console.warn(
		"[TinaCMS Auth] Missing NEXTAUTH_SECRET. Generate one with: openssl rand -base64 32",
	);
}

const handler = NextAuth({
	providers: [
		GithubProvider({
			clientId: GITHUB_CLIENT_ID || "",
			clientSecret: GITHUB_CLIENT_SECRET || "",
		}),
	],
	secret: NEXTAUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, account, profile }) {
			// Optional: Add authorization logic here
			// For now, allow any GitHub user
			// TODO: Restrict to specific GitHub users or organization members
			return true;
		},
		async session({ session, token }) {
			return session;
		},
	},
});

export const ALL: APIRoute = async ({ request }) => {
	return handler(request);
};

export const prerender = false;
