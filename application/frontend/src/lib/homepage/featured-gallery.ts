import { markLoaded } from "@/lib/image-skeleton";

/** Index of the photo for a pointer at `x` inside a stage `width` wide showing `count` photos */
export function indexFromPosition(x: number, width: number, count: number): number {
	if (count <= 1 || width <= 0) return 0;
	const zone = Math.floor((x / width) * count);
	return Math.min(count - 1, Math.max(0, zone));
}

/**
 * Photo step for a touch drag of (`dx`, `dy`) pixels: 1 for a swipe left (next photo), -1 for a
 * swipe right (previous), 0 for a tap, a short drag or a mostly vertical drag (page scrolling).
 */
export function swipeDirection(dx: number, dy: number, threshold = 30): -1 | 0 | 1 {
	if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return 0;
	return dx < 0 ? 1 : -1;
}

/**
 * Lets a mouse step through the photos of a spotlight: moving across the stage shows the photo
 * for that zone, and leaving it keeps the photo that was showing. Photos cut instantly, with no
 * fade or slide. Touch and pen swipe left or right instead (a swipe does not open the link under
 * it, a plain tap still does). Without the script only the first photo is visible.
 * Expects `<img>` photos and optional `[data-gallery-dot]` markers inside `stage`.
 */
export function initFeaturedGallery(stage: HTMLElement): void {
	const images = Array.from(stage.querySelectorAll<HTMLImageElement>("img"));
	if (images.length < 2) return;
	const dots = Array.from(stage.querySelectorAll<HTMLElement>("[data-gallery-dot]"));

	let current = 0;
	let preloaded = false;

	const show = (index: number) => {
		if (index === current) return;
		current = index;
		// The loading skeleton waits for the first photo only; a step ends it, so the photo the
		// user asked for is never kept transparent
		if (stage.classList.contains("skeleton")) markLoaded(stage);
		images.forEach((img, i) => {
			img.hidden = i !== index;
		});
		dots.forEach((dot, i) => {
			if (i === index) dot.dataset.active = "";
			else delete dot.dataset.active;
		});
	};

	// Hidden photos are lazy and would not load until shown, which would flash a blank frame
	const preload = () => {
		if (preloaded) return;
		preloaded = true;
		for (const img of images) img.loading = "eager";
	};

	stage.addEventListener("pointerenter", (event) => {
		if (event.pointerType === "mouse") preload();
	});
	// Touch and pen: a horizontal swipe steps through the photos. The stage allows vertical panning
	// (`touch-action: pan-y`) so scrolling the page still works.
	let startX = 0;
	let startY = 0;
	let tracking = false;
	let swiped = false;
	stage.addEventListener("pointerdown", (event) => {
		if (event.pointerType === "mouse") return;
		tracking = true;
		swiped = false;
		startX = event.clientX;
		startY = event.clientY;
	});
	stage.addEventListener("pointerup", (event) => {
		if (!tracking || event.pointerType === "mouse") return;
		tracking = false;
		const step = swipeDirection(event.clientX - startX, event.clientY - startY);
		if (step === 0) return;
		swiped = true;
		preload();
		show(Math.min(images.length - 1, Math.max(0, current + step)));
	});
	stage.addEventListener("pointercancel", () => {
		tracking = false;
	});
	stage.addEventListener("click", (event) => {
		if (!swiped) return;
		swiped = false;
		event.preventDefault();
	});

	stage.addEventListener("pointermove", (event) => {
		if (event.pointerType !== "mouse") return;
		preload();
		const rect = stage.getBoundingClientRect();
		show(indexFromPosition(event.clientX - rect.left, rect.width, images.length));
	});
}
