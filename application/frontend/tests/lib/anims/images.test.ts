import { describe, expect, it } from "bun:test";
import { type FadeImage, watchImage } from "@/lib/anims/images";

function fakeImage(complete: boolean) {
	const listeners: Record<string, () => void> = {};
	const img: FadeImage & { fire(type: string): void } = {
		complete,
		dataset: {},
		addEventListener(type, listener) {
			listeners[type] = listener;
		},
		fire(type) {
			listeners[type]?.();
		},
	};
	return img;
}

describe("watchImage", () => {
	it("marks an image that already finished loading right away", () => {
		const img = fakeImage(true);
		watchImage(img);
		expect(img.dataset.loaded).toBe("");
	});

	it("waits for the load event otherwise", () => {
		const img = fakeImage(false);
		watchImage(img);
		expect(img.dataset.loaded).toBeUndefined();
		img.fire("load");
		expect(img.dataset.loaded).toBe("");
	});

	it("treats an error as finished so a broken image never stays invisible", () => {
		const img = fakeImage(false);
		watchImage(img);
		img.fire("error");
		expect(img.dataset.loaded).toBe("");
	});

	it("does not register twice on an image that is already marked", () => {
		const img = fakeImage(false);
		img.dataset.loaded = "";
		let registered = 0;
		img.addEventListener = () => {
			registered++;
		};
		watchImage(img);
		expect(registered).toBe(0);
	});
});
