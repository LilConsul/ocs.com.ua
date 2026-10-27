import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { revealOnce } from "@/lib/anims/reveal-once";

describe("revealOnce animation helper", () => {
	let originalWindow: typeof globalThis.window;
	let originalIntersectionObserver: typeof globalThis.IntersectionObserver;
	let observerCallback: IntersectionObserverCallback;
	let disconnectCalled: boolean;
	let observedElements: unknown[];
	let observerOptions: IntersectionObserverInit | undefined;

	// Which media queries currently match; everything else reports false
	let matching: string[];
	const matches = (query: string) => matching.includes(query);

	beforeEach(() => {
		matching = [];
		originalWindow = globalThis.window;
		originalIntersectionObserver = globalThis.IntersectionObserver;
		disconnectCalled = false;
		observedElements = [];
		observerOptions = undefined;

		class MockIntersectionObserver {
			readonly root = null;
			readonly rootMargin = "0px";
			readonly thresholds = [0];

			constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
				observerCallback = callback;
				observerOptions = options;
			}

			observe(target: unknown) {
				observedElements.push(target);
			}

			unobserve() {}

			disconnect() {
				disconnectCalled = true;
			}

			takeRecords() {
				return [];
			}
		}

		// @ts-expect-error mock IntersectionObserver
		globalThis.IntersectionObserver = MockIntersectionObserver;

		const mockWin = {
			matchMedia: mock((query: string) => ({
				matches: matches(query),
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => true,
			})),
			IntersectionObserver: MockIntersectionObserver,
		};

		// @ts-expect-error mock window
		globalThis.window = mockWin;
	});

	afterEach(() => {
		globalThis.window = originalWindow;
		globalThis.IntersectionObserver = originalIntersectionObserver;
	});

	const createElement = (): HTMLElement => {
		return { dataset: {} } as unknown as HTMLElement;
	};

	it("uses the requested threshold on larger screens", () => {
		revealOnce(createElement(), 0.35);

		expect(observerOptions?.threshold).toBe(0.35);
	});

	it("defaults to a 0.2 threshold on larger screens", () => {
		revealOnce(createElement());

		expect(observerOptions?.threshold).toBe(0.2);
	});

	it("forces threshold 0 on mobile so tall elements trigger reliably", () => {
		matching = ["(max-width: 767px)"];
		revealOnce(createElement(), 0.35);

		expect(observerOptions?.threshold).toBe(0);
	});

	it("sets data-anim='ready' immediately and switches to 'in' on intersection", () => {
		const el = createElement();
		revealOnce(el);

		expect(el.dataset.anim).toBe("ready");
		expect(observedElements).toContain(el);

		// Simulate intersection observer trigger
		observerCallback(
			[
				{
					isIntersecting: true,
					target: el,
					intersectionRatio: 0.05,
				} as unknown as IntersectionObserverEntry,
			],
			{} as IntersectionObserver
		);

		expect(el.dataset.anim).toBe("in");
		expect(disconnectCalled).toBe(true);
	});

	it("does not switch to 'in' when entry is not intersecting", () => {
		const el = createElement();
		revealOnce(el);

		expect(el.dataset.anim).toBe("ready");

		observerCallback(
			[
				{
					isIntersecting: false,
					target: el,
					intersectionRatio: 0,
				} as unknown as IntersectionObserverEntry,
			],
			{} as IntersectionObserver
		);

		expect(el.dataset.anim).toBe("ready");
		expect(disconnectCalled).toBe(false);
	});

	it("does nothing when user prefers reduced motion", () => {
		globalThis.window.matchMedia = mock((_query: string) => ({
			matches: true,
			media: "",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => true,
		})) as unknown as typeof window.matchMedia;

		const el = createElement();
		revealOnce(el);

		expect(el.dataset.anim).toBeUndefined();
		expect(observedElements.length).toBe(0);
	});

	it("does nothing when IntersectionObserver is not available", () => {
		// @ts-expect-error test missing API
		delete globalThis.window.IntersectionObserver;
		// @ts-expect-error test missing API
		delete globalThis.IntersectionObserver;

		const el = createElement();
		revealOnce(el);

		expect(el.dataset.anim).toBeUndefined();
	});
});
