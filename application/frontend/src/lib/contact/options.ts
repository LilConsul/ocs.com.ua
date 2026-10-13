// Shared sector and equipment option lists.
// Both the form components and the server-side validator import from here
// to ensure the same allow-list is enforced on both sides.

export const SECTORS = [
	"Food & Beverage",
	"Pharmaceutical",
	"Cosmetics",
	"Logistics & Distribution",
	"Other",
] as const;

export type Sector = (typeof SECTORS)[number];

// Equipment slugs from src/data/equipment-types.json.
// "catchweigher" is intentionally omitted: the form offers a single combined
// "checkweigher" option covering both checkweighers and catchweighers.
export const EQUIPMENT_SLUGS = [
	"checkweigher",
	"track-and-trace",
	"metal-detectors",
	"x-ray-inspection",
	"miscellaneous",
] as const;

export type EquipmentSlug = (typeof EQUIPMENT_SLUGS)[number];
