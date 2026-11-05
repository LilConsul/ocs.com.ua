import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import config from "../../astro.config.mjs";

const SRC = join(import.meta.dir, "../../src");

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});

const sources = walk(SRC);

describe("astro config: preloading", () => {
	it("prefetches every internal link on hover/tap", () => {
		expect(config.prefetch).toEqual({ prefetchAll: true, defaultStrategy: "hover" });
	});
});

describe("astro config: islands", () => {
	it("registers no UI framework integration, so client:* islands cannot hydrate", () => {
		const names = (config.integrations ?? []).flat().map((i) => (i as { name?: string }).name);
		expect(names).not.toContain("@astrojs/react");
		expect(names).not.toContain("@astrojs/preact");
		expect(names).not.toContain("@astrojs/vue");
		expect(names).not.toContain("@astrojs/svelte");
	});

	it("has no framework component files under src/", () => {
		const frameworkFiles = sources.filter((f) =>
			[".tsx", ".jsx", ".vue", ".svelte"].includes(extname(f))
		);
		expect(frameworkFiles).toEqual([]);
	});

	it("uses no client:* or server:defer directives (they need integrations / on-demand pages)", () => {
		const offenders = sources
			.filter((f) => extname(f) === ".astro")
			.filter((f) =>
				/\s(client:(load|idle|visible|media|only)|server:defer)\b/.test(readFileSync(f, "utf8"))
			);
		expect(offenders).toEqual([]);
	});
});

describe("astro config: astro:page-load listeners", () => {
	// astro:page-load only fires with <ClientRouter />. Without it the listeners are dead code,
	// so this guards against the router being added while setups are not idempotent.
	it("has no ClientRouter, so page-load listeners only ever run via their direct call", () => {
		const usesRouter = sources.some((f) =>
			/ClientRouter|ViewTransitions/.test(readFileSync(f, "utf8"))
		);
		expect(usesRouter).toBe(false);
	});
});
