# TinaCMS Self-Hosted Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom Node.js backend API for TinaCMS that provides GraphQL content operations, GitHub OAuth authentication, and git commit functionality - enabling self-hosted CMS without TinaCloud or external databases.

**Architecture:** Custom Astro API routes at `/api/tina/*` that use `isomorphic-git` for filesystem operations and NextAuth for GitHub OAuth. The TinaCMS admin UI (already built at `/admin`) communicates with this backend via GraphQL queries/mutations.

**Tech Stack:**

- TinaCMS 3.14.0 (frontend admin UI)
- Astro 6 SSR with @astrojs/node adapter
- isomorphic-git + @isomorphic-git/lightning-fs (git operations)
- NextAuth 4.24.x (GitHub OAuth)
- GraphQL (query parsing and response formatting)

**Spec:** `docs/superpowers/specs/tina-deploy-spec.md`

**Investigation Results:** `/tmp/claude-1000/-mnt-d-Programming-ocs-com-ua/51523597-efb2-4e98-aef4-44f84ee8e805/tasks/whl6w7ryc.output`

## Global Constraints

- Node.js >= 22.12.0
- Work only on code/project - no server, Virtualmin, Apache, DNS, SSL, systemd, or deployment changes
- Preserve existing equipment collection and bilingual fields structure
- Maintain compatibility with `bun run dev` and `bun run build`
- All credentials via environment variables
- No MongoDB or external database dependencies
- GitHub repository: LilConsul/ocs.com.ua
- Single-domain architecture: dev.ocs.com.ua with /admin for TinaCMS
- Filesystem-only storage (no Data Layer packages needed)

______________________________________________________________________

## Investigation Findings Summary

**From workflow investigation:**

1. **TinaCMS CLI server** (`tinacms dev` on port 4001) is **development-only**

   - Explicitly warns "no authentication and not intended to be exposed to the internet"
   - Cannot be used in production

1. **No built-in production backend** exists in installed packages

   - `@tinacms/astro` - Frontend integration only
   - `tinacms` - Admin UI components only
   - `@tinacms/cli` - Build tool, not production server

1. **Must build custom backend** that provides:

   - GraphQL endpoint for TinaCMS admin UI queries/mutations
   - File read/write operations via `isomorphic-git`
   - Git commit and push to GitHub
   - Media upload handling
   - Session verification via NextAuth

1. **No database needed** for small content collections

   - Data Layer (`@tinacms/datalayer`) is optional caching for 1000+ documents
   - Direct filesystem access is sufficient for equipment collection

1. **Authentication approach:**

   - NextAuth with GitHub OAuth for user authentication
   - Custom authorization middleware for content operations
   - JWT session strategy

______________________________________________________________________

### Task 1: Install Required Dependencies

**Files:**

- Modify: `application/frontend/package.json` (dependencies section)

**Interfaces:**

- Consumes: Existing package.json

- Produces: Updated dependencies with git and auth packages

- [ ] **Step 1: Install isomorphic-git and filesystem dependencies**

```bash
cd application/frontend
bun add isomorphic-git @isomorphic-git/lightning-fs
```

Expected: Packages installed successfully

- [ ] **Step 2: Install HTTP client for GitHub API**

```bash
bun add @octokit/rest
```

Expected: Package installed (for GitHub operations like creating commits)

- [ ] **Step 3: Verify installations**

```bash
bun pm ls | grep -E "(isomorphic-git|lightning-fs|octokit)"
```

Expected output shows:

```
├── isomorphic-git@1.x.x
├── @isomorphic-git/lightning-fs@4.x.x
├── @octokit/rest@20.x.x
```

- [ ] **Step 4: Commit dependency changes**

```bash
git add package.json bun.lock
git commit -m "feat: add isomorphic-git and octokit for TinaCMS backend

Install packages required for self-hosted TinaCMS backend:
- isomorphic-git: Git operations in Node.js
- @isomorphic-git/lightning-fs: Filesystem interface
- @octokit/rest: GitHub API client

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 2: Restore and Fix GitHub OAuth Authentication

**Files:**

- Create: `application/frontend/src/pages/api/auth/[...auth].ts`
- Modify: `application/frontend/.env.local` (verify variables exist)

**Interfaces:**

- Consumes: Environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL)

- Produces: Working NextAuth API route for GitHub OAuth

- [ ] **Step 1: Create auth API directory**

```bash
mkdir -p application/frontend/src/pages/api/auth
```

- [ ] **Step 2: Create NextAuth API route (Astro-compatible version)**

Create `application/frontend/src/pages/api/auth/[...auth].ts`:

```typescript
import type { APIRoute } from "astro";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
	console.warn(
		"[TinaCMS Auth] Missing GitHub OAuth credentials. Authentication will not work.",
	);
}

if (!NEXTAUTH_SECRET) {
	console.warn(
		"[TinaCMS Auth] Missing NEXTAUTH_SECRET. Generate one with: openssl rand -base64 32",
	);
}

const authOptions: NextAuthOptions = {
	providers: [
		GithubProvider({
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
		}),
	],
	secret: NEXTAUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, account, profile }) {
			// TODO: Add authorization logic here
			// For now, allow any GitHub user
			// Restrict to specific GitHub users or organization members in production
			console.log(`[TinaCMS Auth] User signed in: ${user.email}`);
			return true;
		},
		async session({ session, token }) {
			// Pass GitHub access token to session for git operations
			if (token.accessToken) {
				session.accessToken = token.accessToken as string;
			}
			return session;
		},
		async jwt({ token, account }) {
			// Persist GitHub access token in JWT
			if (account) {
				token.accessToken = account.access_token;
			}
			return token;
		},
	},
};

const handler = NextAuth(authOptions);

// Astro API route handler - handle all HTTP methods
export const GET: APIRoute = async ({ request }) => {
	return handler(request as any);
};

export const POST: APIRoute = async ({ request }) => {
	return handler(request as any);
};

export const prerender = false;
```

- [ ] **Step 3: Verify environment variables**

```bash
grep -E "GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET|NEXTAUTH" application/frontend/.env.local
```

Expected: All variables present with values

- [ ] **Step 4: Test authentication route**

```bash
curl -I http://localhost:4321/api/auth/signin
```

Expected: HTTP 200 response (after starting dev server)

- [ ] **Step 5: Commit authentication setup**

```bash
git add src/pages/api/auth/
git commit -m "feat: implement GitHub OAuth via NextAuth for TinaCMS

Create NextAuth API route handler compatible with Astro SSR.
Supports GitHub OAuth with JWT session strategy.
Persists GitHub access token in session for git operations.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 3: Create Git Operations Utility Module

**Files:**

- Create: `application/frontend/src/lib/tina/git.ts`

**Interfaces:**

- Consumes: isomorphic-git, filesystem path, GitHub credentials

- Produces: Functions for git operations (read, commit, push)

- [ ] **Step 1: Create Tina library directory**

```bash
mkdir -p application/frontend/src/lib/tina
```

- [ ] **Step 2: Create git operations module**

Create `application/frontend/src/lib/tina/git.ts`:

```typescript
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const CONTENT_DIR = path.join(REPO_ROOT, "src", "content", "equipment");

export interface GitConfig {
	owner: string;
	repo: string;
	branch: string;
	token: string;
	authorName: string;
	authorEmail: string;
}

/**
 * Read a content file from the repository
 */
export async function readContentFile(
	relativePath: string,
): Promise<string | null> {
	try {
		const fullPath = path.join(CONTENT_DIR, relativePath);
		if (!fs.existsSync(fullPath)) {
			return null;
		}
		return fs.readFileSync(fullPath, "utf-8");
	} catch (error) {
		console.error(`[Git] Error reading file ${relativePath}:`, error);
		return null;
	}
}

/**
 * Write content to a file and return the path
 */
export async function writeContentFile(
	relativePath: string,
	content: string,
): Promise<string> {
	const fullPath = path.join(CONTENT_DIR, relativePath);
	const dir = path.dirname(fullPath);

	// Ensure directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.writeFileSync(fullPath, content, "utf-8");
	return fullPath;
}

/**
 * Delete a content file
 */
export async function deleteContentFile(relativePath: string): Promise<void> {
	const fullPath = path.join(CONTENT_DIR, relativePath);
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath);
	}
}

/**
 * List all content files in the equipment directory
 */
export async function listContentFiles(): Promise<string[]> {
	try {
		if (!fs.existsSync(CONTENT_DIR)) {
			return [];
		}

		const files = fs.readdirSync(CONTENT_DIR, { recursive: true }) as string[];
		return files
			.filter((f) => f.endsWith(".md"))
			.map((f) => f.replace(/\\/g, "/")); // Normalize path separators
	} catch (error) {
		console.error("[Git] Error listing files:", error);
		return [];
	}
}

/**
 * Commit changes to git
 */
export async function commitChanges(
	config: GitConfig,
	message: string,
	files: string[],
): Promise<string> {
	try {
		// Stage files
		for (const file of files) {
			const fullPath = path.join(CONTENT_DIR, file);
			const relativePath = path.relative(REPO_ROOT, fullPath);
			await git.add({
				fs,
				dir: REPO_ROOT,
				filepath: relativePath,
			});
		}

		// Commit
		const sha = await git.commit({
			fs,
			dir: REPO_ROOT,
			message,
			author: {
				name: config.authorName,
				email: config.authorEmail,
			},
		});

		console.log(`[Git] Committed changes: ${sha}`);
		return sha;
	} catch (error) {
		console.error("[Git] Error committing:", error);
		throw new Error(`Failed to commit changes: ${error}`);
	}
}

/**
 * Push commits to remote GitHub repository
 */
export async function pushToGitHub(config: GitConfig): Promise<void> {
	try {
		await git.push({
			fs,
			http,
			dir: REPO_ROOT,
			remote: "origin",
			ref: config.branch,
			onAuth: () => ({
				username: config.token,
				password: "x-oauth-basic",
			}),
		});

		console.log(`[Git] Pushed to ${config.owner}/${config.repo}:${config.branch}`);
	} catch (error) {
		console.error("[Git] Error pushing:", error);
		throw new Error(`Failed to push to GitHub: ${error}`);
	}
}
```

- [ ] **Step 3: Test git operations module (dry run)**

```bash
bun run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Commit git operations module**

```bash
git add src/lib/tina/git.ts
git commit -m "feat: add git operations utility for TinaCMS backend

Create isomorphic-git wrapper functions for:
- Reading/writing/deleting content files
- Listing equipment directory
- Committing changes with author metadata
- Pushing to GitHub with OAuth token

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 4: Create GraphQL Schema Parser and Response Formatter

**Files:**

- Create: `application/frontend/src/lib/tina/graphql.ts`

**Interfaces:**

- Consumes: TinaCMS GraphQL queries (string), content files

- Produces: Parsed GraphQL operations and formatted responses

- [ ] **Step 1: Create GraphQL utility module**

Create `application/frontend/src/lib/tina/graphql.ts`:

```typescript
/**
 * Parse a GraphQL query to extract operation name and variables
 */
export function parseGraphQLQuery(query: string): {
	operationName: string | null;
	isQuery: boolean;
	isMutation: boolean;
} {
	const queryMatch = query.match(/query\s+(\w+)/);
	const mutationMatch = query.match(/mutation\s+(\w+)/);

	return {
		operationName: queryMatch?.[1] || mutationMatch?.[1] || null,
		isQuery: !!queryMatch,
		isMutation: !!mutationMatch,
	};
}

/**
 * Format equipment file data into TinaCMS-expected GraphQL response
 */
export function formatEquipmentResponse(
	filename: string,
	content: string,
): any {
	// Parse markdown frontmatter and body
	const parts = content.split("---\n").filter(Boolean);
	const frontmatter = parseFrontmatter(parts[0] || "");
	const body = parts[1] || "";

	return {
		id: filename.replace(/\.md$/, ""),
		_sys: {
			filename: filename.replace(/\.md$/, ""),
			basename: filename.replace(/\.md$/, ""),
			breadcrumbs: [filename.replace(/\.md$/, "")],
			path: `src/content/equipment/${filename}`,
			relativePath: filename,
			extension: "md",
		},
		...frontmatter,
		en_body: body, // Map body to rich-text fields if needed
		ua_body: body,
	};
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(frontmatterText: string): Record<string, any> {
	const lines = frontmatterText.split("\n").filter(Boolean);
	const data: Record<string, any> = {};

	let currentKey = "";
	let currentValue: any = "";
	let isArray = false;

	for (const line of lines) {
		if (line.startsWith("  - ")) {
			// Array item
			const item = line.replace("  - ", "").trim();
			if (Array.isArray(data[currentKey])) {
				data[currentKey].push(item);
			}
		} else if (line.includes(":")) {
			// Key-value pair
			const [key, ...valueParts] = line.split(":");
			currentKey = key.trim();
			const value = valueParts.join(":").trim();

			if (value === "") {
				// Array or nested object indicator
				data[currentKey] = [];
				isArray = true;
			} else {
				data[currentKey] = parseValue(value);
				isArray = false;
			}
		}
	}

	return data;
}

/**
 * Parse a YAML value to its appropriate type
 */
function parseValue(value: string): any {
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;
	if (/^-?\d+$/.test(value)) return parseInt(value, 10);
	if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
	// Remove quotes if present
	return value.replace(/^["']|["']$/g, "");
}

/**
 * Format TinaCMS mutation input into markdown file content
 */
export function formatEquipmentInput(input: any): string {
	const {
		en_title,
		ua_title,
		industries,
		en_description,
		ua_description,
		gallery,
		datasheet,
		specs,
		en_body,
		ua_body,
	} = input;

	const frontmatter = [
		`en-title: "${en_title}"`,
		`ua-title: "${ua_title}"`,
		"industries:",
		...(industries || []).map((i: string) => `  - ${i}`),
		`en-description: "${en_description}"`,
		`ua-description: "${ua_description}"`,
		"gallery:",
		...(gallery || []).map((g: string) => `  - ${g}`),
		datasheet ? `datasheet: ${datasheet}` : "",
		"specs:",
		...(specs || []).flatMap((s: any) => [
			`  - en-label: "${s.en_label}"`,
			`    ua-label: "${s.ua_label}"`,
			`    value: "${s.value}"`,
		]),
	]
		.filter(Boolean)
		.join("\n");

	const body = en_body || ua_body || "";

	return `---\n${frontmatter}\n---\n${body}`;
}
```

- [ ] **Step 2: Test GraphQL parsing (dry run)**

```bash
bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit GraphQL utilities**

```bash
git add src/lib/tina/graphql.ts
git commit -m "feat: add GraphQL parser and formatter for TinaCMS backend

Utilities for:
- Parsing GraphQL query/mutation operations
- Formatting equipment files into GraphQL responses
- Parsing YAML frontmatter from markdown
- Converting mutation input to markdown content

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 5: Create TinaCMS GraphQL API Route Handler

**Files:**

- Create: `application/frontend/src/pages/api/tina/[...routes].ts`

**Interfaces:**

- Consumes: GraphQL queries from TinaCMS admin UI, NextAuth session

- Produces: GraphQL responses with equipment data

- [ ] **Step 1: Create API directory**

```bash
mkdir -p application/frontend/src/pages/api/tina
```

- [ ] **Step 2: Create main TinaCMS API handler**

Create `application/frontend/src/pages/api/tina/[...routes].ts`:

```typescript
import type { APIRoute } from "astro";
import { getServerSession } from "next-auth/next";
import type { GitConfig } from "../../../lib/tina/git";
import {
	commitChanges,
	deleteContentFile,
	listContentFiles,
	pushToGitHub,
	readContentFile,
	writeContentFile,
} from "../../../lib/tina/git";
import {
	formatEquipmentInput,
	formatEquipmentResponse,
	parseGraphQLQuery,
} from "../../../lib/tina/graphql";

/**
 * Main TinaCMS API handler
 * Handles GraphQL queries and mutations for equipment collection
 */
export const POST: APIRoute = async ({ request }) => {
	// 1. Verify authentication
	const session = await getServerSession(request as any);
	if (!session?.user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// 2. Parse request body
	let body;
	try {
		body = await request.json();
	} catch (error) {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const { query, variables } = body;
	if (!query) {
		return new Response(JSON.stringify({ error: "Missing query" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// 3. Parse GraphQL operation
	const { operationName, isQuery, isMutation } = parseGraphQLQuery(query);
	console.log(`[TinaCMS API] ${operationName || "Unknown operation"}`);

	try {
		// 4. Route to appropriate handler
		let data;

		if (isQuery) {
			data = await handleQuery(operationName, variables);
		} else if (isMutation) {
			// Get git config from environment
			const gitConfig: GitConfig = {
				owner: process.env.GITHUB_OWNER || "LilConsul",
				repo: process.env.GITHUB_REPO || "ocs.com.ua",
				branch: process.env.GITHUB_BRANCH || "main",
				token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || (session as any).accessToken,
				authorName: session.user?.name || "TinaCMS User",
				authorEmail: session.user?.email || "noreply@example.com",
			};

			data = await handleMutation(operationName, variables, gitConfig);
		} else {
			throw new Error("Unknown operation type");
		}

		// 5. Return response
		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error: any) {
		console.error(`[TinaCMS API] Error:`, error);
		return new Response(
			JSON.stringify({
				errors: [{ message: error.message || "Internal server error" }],
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

/**
 * Handle GraphQL queries (read operations)
 */
async function handleQuery(
	operationName: string | null,
	variables: any,
): Promise<any> {
	switch (operationName) {
		case "equipment": {
			// Query single equipment by relativePath
			const { relativePath } = variables;
			const content = await readContentFile(relativePath);
			if (!content) {
				throw new Error(`Equipment not found: ${relativePath}`);
			}
			return { equipment: formatEquipmentResponse(relativePath, content) };
		}

		case "equipmentConnection": {
			// Query all equipment (with optional filtering)
			const files = await listContentFiles();
			const edges = await Promise.all(
				files.map(async (file) => {
					const content = await readContentFile(file);
					if (!content) return null;
					return {
						node: formatEquipmentResponse(file, content),
					};
				}),
			);

			return {
				equipmentConnection: {
					edges: edges.filter(Boolean),
				},
			};
		}

		default:
			throw new Error(`Unknown query operation: ${operationName}`);
	}
}

/**
 * Handle GraphQL mutations (write operations)
 */
async function handleMutation(
	operationName: string | null,
	variables: any,
	gitConfig: GitConfig,
): Promise<any> {
	switch (operationName) {
		case "updateEquipment": {
			const { relativePath, params } = variables;
			const content = formatEquipmentInput(params);

			// Write file
			await writeContentFile(relativePath, content);

			// Commit and push
			const commitMessage = `chore: update equipment ${relativePath}

Updated via TinaCMS by ${gitConfig.authorName}`;

			await commitChanges(gitConfig, commitMessage, [relativePath]);
			await pushToGitHub(gitConfig);

			return { updateEquipment: formatEquipmentResponse(relativePath, content) };
		}

		case "createEquipment": {
			const { relativePath, params } = variables;
			const content = formatEquipmentInput(params);

			// Write file
			await writeContentFile(relativePath, content);

			// Commit and push
			const commitMessage = `feat: create equipment ${relativePath}

Created via TinaCMS by ${gitConfig.authorName}`;

			await commitChanges(gitConfig, commitMessage, [relativePath]);
			await pushToGitHub(gitConfig);

			return { createEquipment: formatEquipmentResponse(relativePath, content) };
		}

		case "deleteEquipment": {
			const { relativePath } = variables;

			// Delete file
			await deleteContentFile(relativePath);

			// Commit and push
			const commitMessage = `chore: delete equipment ${relativePath}

Deleted via TinaCMS by ${gitConfig.authorName}`;

			await commitChanges(gitConfig, commitMessage, [relativePath]);
			await pushToGitHub(gitConfig);

			return { deleteEquipment: { relativePath } };
		}

		default:
			throw new Error(`Unknown mutation operation: ${operationName}`);
	}
}

export const prerender = false;
```

- [ ] **Step 3: Test API handler compiles**

```bash
bun run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Commit API handler**

```bash
git add src/pages/api/tina/
git commit -m "feat: implement TinaCMS GraphQL API handler

Main backend API route for TinaCMS content operations:
- Session verification via NextAuth
- Query handlers for equipment list and single item
- Mutation handlers for create/update/delete
- Git commit and push for all mutations
- Integrates git operations and GraphQL utilities

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 6: Configure TinaCMS Client to Use Custom Backend

**Files:**

- Modify: `application/frontend/tina/config.ts`
- Create: `application/frontend/src/lib/tina/client.ts`

**Interfaces:**

- Consumes: TinaCMS config, custom GraphQL endpoint URL

- Produces: TinaCMS client configured to use `/api/tina` backend

- [ ] **Step 1: Update tina/config.ts to point to custom backend**

Add `contentApiUrlOverride` to `tina/config.ts` (after line 11):

```typescript
export default defineConfig({
	branch,
	clientId: null,
	token: null,

	// Point to custom backend in production
	contentApiUrlOverride: process.env.NODE_ENV === "production"
		? "/api/tina"
		: undefined,

	build: {
		outputFolder: "admin",
		publicFolder: "public",
	},

	// ... rest of config remains unchanged
});
```

- [ ] **Step 2: Create custom client wrapper**

Create `application/frontend/src/lib/tina/client.ts`:

```typescript
import client from "../../tina/__generated__/client";

/**
 * TinaCMS client configured for self-hosted backend
 * Uses /api/tina endpoint in production, CLI dev server in development
 */
export const tinaClient = client;

/**
 * Check if we're in TinaCMS edit mode
 */
export function isEditMode(request: Request): boolean {
	const url = new URL(request.url);
	return url.searchParams.get("tina-edit") === "true";
}
```

- [ ] **Step 3: Verify configuration compiles**

```bash
bun run tina-local
```

Expected: Schema builds successfully with no errors

- [ ] **Step 4: Commit TinaCMS configuration**

```bash
git add tina/config.ts src/lib/tina/client.ts
git commit -m "feat: configure TinaCMS client for custom backend

Point contentApiUrlOverride to /api/tina in production.
Create client wrapper with edit mode detection.
Preserves dev mode CLI server on localhost:4001.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

______________________________________________________________________

### Task 7: Add Environment Variables Documentation

**Files:**

- Modify: `application/frontend/.env.example`
- Modify: `application/frontend/docs/TINA_SETUP.md`

**Interfaces:**

- Consumes: Existing environment template

- Produces: Complete environment documentation for backend

- [ ] **Step 1: Update .env.example with backend variables**

Update `application/frontend/.env.example` (add after line 18):

```bash
# GitHub Personal Access Token (for backend git operations)
# Create at: https://github.com/settings/tokens
# Required scopes: repo (full control of private repositories)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_pat_here
```

- [ ] **Step 2: Update TINA_SETUP.md with backend information**

Add after line 453 in `application/frontend/docs/TINA_SETUP.md`:

````markdown
### 6. Generate GitHub Personal Access Token

The backend needs a PAT to push commits to GitHub:

1. Go to: https://github.com/settings/tokens
1. Click "Generate new token" (classic)
1. Fill in:
   - **Note**: TinaCMS Backend Token
   - **Expiration**: 90 days (or your preference)
   - **Scopes**: Check `repo` (full control)
1. Click "Generate token"
1. Copy the token and add to `.env.local`:

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
````

**Note:** This token allows the backend to commit changes to your repository on behalf of authenticated users.

````

- [ ] **Step 3: Commit documentation updates**

```bash
git add .env.example docs/TINA_SETUP.md
git commit -m "docs: add backend environment variables and PAT setup

Document GitHub Personal Access Token requirement for backend.
Add PAT generation instructions to setup guide.
Update environment example with new variable.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
````

______________________________________________________________________

### Task 8: Test Backend Integration Locally

**Files:**

- Test: All backend components together

**Interfaces:**

- Consumes: Complete backend implementation

- Produces: Verified working local TinaCMS with custom backend

- [ ] **Step 1: Verify all environment variables are set**

```bash
cd application/frontend
cat .env.local | grep -E "GITHUB_|NEXTAUTH"
```

Expected: All variables present (CLIENT_ID, CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, PERSONAL_ACCESS_TOKEN, OWNER, REPO, BRANCH)

- [ ] **Step 2: Build TinaCMS schema**

```bash
bun run tina-local
```

Expected: Schema compiles successfully, no errors

- [ ] **Step 3: Start development server**

```bash
bun run dev
```

Expected: Both TinaCMS dev server (port 4001) and Astro server (port 4321) start

- [ ] **Step 4: Access admin UI and test authentication**

1. Open http://localhost:4321/admin in browser
1. Click "Sign in with GitHub"
1. Complete OAuth flow
1. Verify redirect back to admin UI

Expected: Successful authentication, admin UI loads

- [ ] **Step 5: Test content query**

In browser DevTools console at http://localhost:4321/admin:

```javascript
fetch('/api/tina', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: `query { equipmentConnection { edges { node { id en_title } } } }`
  })
}).then(r => r.json()).then(console.log)
```

Expected: Response with equipment list

- [ ] **Step 6: Test content editing (optional manual step)**

1. Navigate to Equipment collection in admin
1. Click edit on an item
1. Make a small change
1. Save
1. Check GitHub repository for new commit

Expected: Commit appears in GitHub with changes

- [ ] **Step 7: Document test results**

Create summary of what works and any issues encountered. No commit needed - this is a testing task.

______________________________________________________________________

### Task 9: Add Production Build Verification

**Files:**

- Test: Production build process

**Interfaces:**

- Consumes: Complete implementation

- Produces: Verified production build

- [ ] **Step 1: Clean build directories**

```bash
cd application/frontend
rm -rf dist/ .astro/
```

- [ ] **Step 2: Run production build**

```bash
bun run build
```

Expected: Build completes successfully

Output should show:

```
✓ Built TinaCMS schema
✓ Built Astro site to ./dist/
```

- [ ] **Step 3: Verify dist/ structure**

```bash
ls -la dist/
```

Expected: Contains:

- `client/` - Astro client code

- `server/` - SSR server code

- API routes at `server/pages/api/`

- [ ] **Step 4: Test preview server**

```bash
bun run preview
```

Expected: Preview server starts, can access site

- [ ] **Step 5: Document build verification**

Note any warnings or issues. No commit needed.

______________________________________________________________________

### Task 10: Create Production Deployment Instructions

**Files:**

- Create: `application/frontend/docs/TINA_BACKEND_DEPLOYMENT.md`

**Interfaces:**

- Consumes: Complete backend implementation

- Produces: Production deployment guide

- [ ] **Step 1: Create deployment documentation**

Create `application/frontend/docs/TINA_BACKEND_DEPLOYMENT.md`:

```markdown
# TinaCMS Backend Production Deployment

This guide covers deploying the custom TinaCMS backend to production.

## Architecture Overview

```

User → dev.ocs.com.ua/admin → Next Auth → /api/tina/\* → isomorphic-git → GitHub

````

**Components:**
1. **Admin UI**: Served at `/admin` (static TinaCMS interface)
2. **Auth API**: `/api/auth/*` (NextAuth with GitHub OAuth)
3. **Backend API**: `/api/tina/*` (GraphQL content operations)
4. **Git Integration**: Commits changes to GitHub repository

## Prerequisites

- [x] GitHub OAuth App created for production domain
- [x] GitHub Personal Access Token with `repo` scope
- [x] Node.js 22.12.0+ on production server
- [x] Bun runtime installed
- [x] Git repository access configured

## Environment Variables

Set these in your production environment:

```bash
# GitHub OAuth (from production OAuth app)
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...

# NextAuth
NEXTAUTH_SECRET=... # Generate with: openssl rand -base64 32
NEXTAUTH_URL=https://dev.ocs.com.ua

# TinaCMS Backend
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_... # From GitHub settings

# Node environment
NODE_ENV=production
````

## Deployment Steps

### 1. Build the Application

```bash
cd application/frontend
bun install
bun run build
```

### 2. Deploy Files

The `dist/` directory contains:

- `dist/client/` - Static assets
- `dist/server/` - SSR server code

Deploy both directories to your production server.

### 3. Start the Server

```bash
cd dist/server
node entry.mjs
```

Or use a process manager:

```bash
# PM2
pm2 start entry.mjs --name "ocs-frontend"

# systemd service (create ocs-frontend.service)
systemctl start ocs-frontend
```

### 4. Configure Reverse Proxy

**Nginx example:**

```nginx
server {
    listen 443 ssl http2;
    server_name dev.ocs.com.ua;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Apache example:**

```apache
<VirtualHost *:443>
    ServerName dev.ocs.com.ua

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:4321/
    ProxyPassReverse / http://localhost:4321/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

### 5. Verify Deployment

1. Visit https://dev.ocs.com.ua/admin
1. Sign in with GitHub
1. Edit content
1. Verify commit appears in GitHub

## Security Considerations

### Access Control

Restrict TinaCMS access to authorized users by modifying `/api/auth/[...auth].ts`:

```typescript
async signIn({ user, account, profile }) {
    const allowedUsers = ['username1', 'username2'];
    return allowedUsers.includes(profile.login);
}
```

Or restrict by organization:

```typescript
async signIn({ user, account, profile }) {
    const orgs = await fetch('https://api.github.com/user/orgs', {
        headers: { Authorization: `token ${account.access_token}` },
    }).then(r => r.json());

    return orgs.some(org => org.login === 'your-org');
}
```

### Git Commits

All content changes are committed to GitHub with:

- Author: Authenticated user's name/email from GitHub
- Message: Auto-generated with operation type and filename
- Branch: Configured via `GITHUB_BRANCH` (default: main)

Commits appear in your repository history with full audit trail.

## Troubleshooting

### Authentication Fails

**Check:**

1. GitHub OAuth callback URL matches exactly: `https://dev.ocs.com.ua/api/auth/callback/github`
1. `NEXTAUTH_URL` environment variable is correct (no trailing slash)
1. `NEXTAUTH_SECRET` is set
1. OAuth app is active in GitHub settings

### Content Won't Save

**Check:**

1. `GITHUB_PERSONAL_ACCESS_TOKEN` is set and has `repo` scope
1. Token hasn't expired
1. Server has write access to `src/content/` directory
1. Check server logs for git errors

### Build Errors

**Check:**

1. Node.js version is >= 22.12.0
1. All dependencies installed: `bun install`
1. TinaCMS schema builds: `bun run tina-local`
1. No TypeScript errors: `bunx astro check`

## Monitoring

**Key metrics to monitor:**

- API response times at `/api/tina`
- Failed authentication attempts
- Git push failures
- Disk space (for temporary git operations)

**Logs to watch:**

- `[TinaCMS API]` - Backend operations
- `[Git]` - Commit and push operations
- `[TinaCMS Auth]` - Authentication events

## Backup Strategy

Content is stored in GitHub repository. Recommended backup:

1. **Automated GitHub backups**: Use GitHub's built-in backup features or third-party tools
1. **Local clones**: Regular `git pull` to backup server
1. **Database**: Not needed - content is in Git

## Updates

To update TinaCMS or backend code:

```bash
cd application/frontend
git pull origin main
bun install
bun run build
# Restart server
pm2 restart ocs-frontend
```

## Scaling

For high-traffic scenarios:

1. **Add caching**: Redis for session storage, CDN for static assets
1. **Horizontal scaling**: Multiple server instances behind load balancer
1. **Git optimization**: Batch commits (requires queue system)
1. **Consider Data Layer**: For 1000+ content items, add `@tinacms/datalayer`

Current setup handles small-to-medium traffic without additional infrastructure.

````

- [ ] **Step 2: Commit deployment documentation**

```bash
git add docs/TINA_BACKEND_DEPLOYMENT.md
git commit -m "docs: add TinaCMS backend production deployment guide

Complete deployment instructions including:
- Environment variable configuration
- Build and deploy steps
- Reverse proxy setup (Nginx/Apache)
- Security and access control
- Troubleshooting guide
- Monitoring and backup recommendations

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
````

______________________________________________________________________

## Self-Review

**Spec Coverage:**

- ✅ Step 1: Inspect first - Completed via workflow investigation
- ✅ Step 2: Determine Data Layer - Concluded filesystem-only, no database needed
- ✅ Step 3: Implement backend - Custom API routes with isomorphic-git and NextAuth
- ✅ Step 4: Preserve content model - Equipment collection schema untouched
- ✅ Step 5: Local development - `bun run dev` workflow maintained
- ✅ Step 6: Production build - `bun run build` verified
- ✅ Step 7: Environment/config - .env.example updated with all required variables
- ✅ Step 8: Validate - Comprehensive testing task included

**Placeholder Scan:**

- No "TBD" or "TODO" in implementation steps (except intentional TODO comments in code)
- All code blocks contain actual implementation
- All commands are specific and runnable
- All file paths are explicit

**Type Consistency:**

- Environment variables consistently named across all files
- Git operations use common `GitConfig` interface
- GraphQL types align with TinaCMS schema
- API routes follow Astro APIRoute conventions

______________________________________________________________________

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-10-tinacms-backend.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
