/** Index of the photo for a pointer at `x` inside a stage `width` wide showing `count` photos */
export function indexFromPosition(x: number, width: number, count: number): number {
	if (count <= 1 || width <= 0) return 0;
	const zone = Math.floor((x / width) * count);
	return Math.min(count - 1, Math.max(0, zone));
}

/**
 * Lets a mouse step through the photos of a spotlight: moving across the stage shows the photo
 * for that zone, and leaving it keeps the photo that was showing. A new photo slides in
 * (`data-enter` = "next" or "prev", animated in CSS) instead of fading. Touch and pen input are
 * ignored, and without the script only the first photo is visible.
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
		const direction = index > current ? "next" : "prev";
		current = index;
		images.forEach((img, i) => {
			img.hidden = i !== index;
			if (i === index) img.dataset.enter = direction;
			else delete img.dataset.enter;
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
	stage.addEventListener("pointermove", (event) => {
		if (event.pointerType !== "mouse") return;
		preload();
		const rect = stage.getBoundingClientRect();
		show(indexFromPosition(event.clientX - rect.left, rect.width, images.length));
	});
}
