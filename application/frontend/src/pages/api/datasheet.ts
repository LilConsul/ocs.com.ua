import { DATASHEET_TOKEN_SECRET } from "astro:env/server";
import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";
import { resolveDatasheet } from "@/lib/datasheet/files";
import { verifyToken } from "@/lib/datasheet/token";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const token = new URL(request.url).searchParams.get("token") ?? "";
	const file = verifyToken(token, DATASHEET_TOKEN_SECRET);
	if (!file) return new Response("Forbidden", { status: 403 });

	// The name is re-validated, so even a signed value cannot leave the datasheet folder
	const path = resolveDatasheet(`/datasheets/${file}`);
	if (!path) return new Response("Not found", { status: 404 });

	return new Response(new Uint8Array(await readFile(path)), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${file}"`,
			"Cache-Control": "private, no-store",
		},
	});
};
