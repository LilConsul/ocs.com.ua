import data from "@/data/icon-shapes.json";

export interface IconShape {
	viewBox: string;
	body: string;
}

const FALLBACK = "category";
const shapes: Record<string, string> = data.shapes;
const warned = new Set<string>();

const has = (name: string): boolean => Object.hasOwn(shapes, name);

function shape(name: string): IconShape {
	return { viewBox: data.viewBox, body: `<path d="${shapes[name]}"/>` };
}

/**
 * Path markup of a Material Symbols icon. Shapes are extracted from the old icon font by
 * scripts/icon-shapes.py. An unknown, empty or unsafe name gives the "category" icon.
 */
export function iconShape(name: string): IconShape {
	if (has(name)) return shape(name);
	if (!warned.has(name)) {
		warned.add(name);
		console.warn(`[material-symbols] unknown icon "${name}", using "${FALLBACK}"`);
	}
	return shape(FALLBACK);
}
