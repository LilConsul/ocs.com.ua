import * as LucideIcons from "lucide-react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

export function loadIcons() {
	document.querySelectorAll("[data-icon]").forEach((element) => {
		const iconName = element.getAttribute("data-icon");
		if (iconName && iconName in LucideIcons) {
			const Icon = LucideIcons[iconName as keyof typeof LucideIcons];
			const root = createRoot(element);
			root.render(
				createElement(Icon, {
					className: element.getAttribute("data-icon-class") || "w-10 h-10",
				})
			);
		}
	});
}
