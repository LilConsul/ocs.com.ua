import { beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAILSAFE_MS } from "@/lib/anims/tokens";

const script = readFileSync(join(import.meta.dir, "../../../src/lib/anims/motion-on.js"), "utf8");

interface Env {
	reduceMotion: boolean;
	hasObserver: boolean;
}

/** Runs the head script against a fake window/document and reports what it did */
function run({ reduceMotion, hasObserver }: Env) {
	const classes = new Set<string>();
	const timers: { fn: () => void; ms: number }[] = [];
	const win: Record<string, unknown> = {
		matchMedia: (query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)" ? reduceMotion : false,
		}),
		setTimeout: (fn: () => void, ms: number) => {
			timers.push({ fn, ms });
			return timers.length;
		},
	};
	if (hasObserver) win.IntersectionObserver = class {};
	const doc = {
		documentElement: {
			classList: {
				add: (name: string) => classes.add(name),
				remove: (name: string) => classes.delete(name),
				contains: (name: string) => classes.has(name),
			},
		},
	};
	new Function("window", "document", script)(win, doc);
	return { classes, timers, win };
}

describe("motion-on head script", () => {
	let env: Env;
	beforeEach(() => {
		env = { reduceMotion: false, hasObserver: true };
	});

	it("adds html.motion-on when motion is allowed", () => {
		expect(run(env).classes.has("motion-on")).toBe(true);
	});

	it("does nothing when the user prefers reduced motion", () => {
		env.reduceMotion = true;
		const { classes, timers } = run(env);
		expect(classes.has("motion-on")).toBe(false);
		expect(timers).toHaveLength(0);
	});

	it("does nothing without IntersectionObserver", () => {
		env.hasObserver = false;
		expect(run(env).classes.has("motion-on")).toBe(false);
	});

	it("removes the class after the failsafe delay if the runtime never loads", () => {
		const { classes, timers } = run(env);
		expect(timers).toHaveLength(1);
		expect(timers[0].ms).toBe(FAILSAFE_MS);
		timers[0].fn();
		expect(classes.has("motion-on")).toBe(false);
	});

	it("publishes the failsafe timer id so the runtime can cancel it", () => {
		const { win } = run(env);
		expect(win.__motionFailsafe).toBe(1);
	});
});
