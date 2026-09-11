import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { getIconComponent } from "./icon-registry";

/**
 * Load icons from data-icon attributes
 * Replaces DOM elements marked with data-icon with Lucide React icons
 */
export function loadIcons() {
	document.querySelectorAll("[data-icon]").forEach((element) => {
		const iconName = element.getAttribute("data-icon");
		if (iconName) {
			const Icon = getIconComponent(iconName);
			const root = createRoot(element);
			root.render(
				createElement(Icon, {
					className: element.getAttribute("data-icon-class") || "w-10 h-10",
				})
			);
		}
	});
}
