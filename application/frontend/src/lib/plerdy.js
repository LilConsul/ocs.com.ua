// Inlined into <head> by Layout.astro (via ?raw). Keep it free of imports.
//
// Plerdy analytics is a third-party script that costs main-thread time and a connection, so it
// loads on the first sign of a visitor: scroll, pointer, touch, key or click. There is no timer.
// The listeners are on window (capture, passive) and all six are removed before the script is
// added, so several events in one frame load it once. Plerdy's own snippet is unchanged: same
// globals, hash, id, referrer policy and URL.
(() => {
	const events = ["scroll", "pointermove", "pointerdown", "touchstart", "keydown", "click"];
	const options = { capture: true, passive: true };

	const load = () => {
		for (const type of events) window.removeEventListener(type, load, options);
		if (window.__plerdyCode) return;
		window.__plerdyCode = 1;
		window._protocol = window.location.protocol === "https:" ? "https://" : "http://";
		window._site_hash_code = "4032906a023912ef8712153f97e74d4c";
		window._suid = 83066;
		const s = document.createElement("script");
		s.async = true;
		s.referrerPolicy = "strict-origin-when-cross-origin";
		s.src = `https://a.plerdy.com/public/js/click/main.js?v=${Math.random()}`;
		document.head.appendChild(s);
	};

	for (const type of events) window.addEventListener(type, load, options);
})();
