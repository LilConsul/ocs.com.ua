/**
 * Shared icon mapping for Lucide React icons
 * Centralizes icon name -> component name mapping
 */
export const ICON_MAP: Record<string, string> = {
	utensils: "Utensils",
	pill: "Pill",
	sparkles: "Sparkles",
	warehouse: "Warehouse",
	grid3x3: "Grid3x3",
};

/**
 * Get the Lucide React component name for an icon
 * @param icon - The icon identifier (lowercase)
 * @returns The component name, or "Circle" as fallback
 */
export function getIconName(icon: string): string {
	return ICON_MAP[icon.toLowerCase()] || "Circle";
}
