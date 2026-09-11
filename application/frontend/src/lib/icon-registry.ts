/**
 * Explicit icon registry for tree-shaking
 * Only imports icons that are actually used in the application
 */

import type { LucideIcon } from "lucide-react";
import { Circle, Grid3x3, Pill, Sparkles, Utensils, Warehouse } from "lucide-react";

export const ICON_REGISTRY = {
	Circle,
	Grid3x3,
	Pill,
	Sparkles,
	Utensils,
	Warehouse,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

/**
 * Get an icon component from the registry
 * @param name - The icon component name
 * @returns The icon component, or Circle as fallback
 */
export function getIconComponent(name: string): LucideIcon {
	return ICON_REGISTRY[name as IconName] || ICON_REGISTRY.Circle;
}
