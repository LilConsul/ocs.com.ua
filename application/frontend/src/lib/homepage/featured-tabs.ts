/** Index of the tab to activate for a key press in a tab list of `count` tabs */
export function nextTabIndex(current: number, count: number, key: string): number {
	if (count <= 1) return 0;
	switch (key) {
		case "ArrowRight":
			return (current + 1) % count;
		case "ArrowLeft":
			return (current - 1 + count) % count;
		case "Home":
			return 0;
		case "End":
			return count - 1;
		default:
			return current;
	}
}

/**
 * Turns the stacked category panels inside `root` into tabs. Without this script every panel
 * stays visible, so `root.dataset.tabsReady` is what CSS keys the tab bar and the hiding on.
 * Expects `[role="tab"]` buttons and `[role="tabpanel"]` elements in the same order.
 */
export function initFeaturedTabs(root: HTMLElement): void {
	const tabs = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));
	const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
	if (tabs.length < 2 || tabs.length !== panels.length) return;

	const select = (index: number, focus = false) => {
		tabs.forEach((tab, i) => {
			const active = i === index;
			tab.setAttribute("aria-selected", String(active));
			tab.tabIndex = active ? 0 : -1;
			panels[i].hidden = !active;
			if (active) panels[i].dataset.active = "";
			else delete panels[i].dataset.active;
		});
		if (focus) tabs[index].focus();
	};

	tabs.forEach((tab, i) => {
		tab.addEventListener("click", () => select(i));
		tab.addEventListener("keydown", (event) => {
			const next = nextTabIndex(i, tabs.length, event.key);
			if (next === i && !["Home", "End"].includes(event.key)) return;
			event.preventDefault();
			select(next, true);
		});
	});

	root.dataset.tabsReady = "";
	select(0);
}
