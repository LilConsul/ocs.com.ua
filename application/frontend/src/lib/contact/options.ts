// Shared sector and equipment option lists.
// Both the form components and the server-side validator import from here
// to ensure the same allow-list is enforced on both sides.

export const SECTORS = [
	"Food Industry",
	"Pharmaceutical",
	"Cosmetics",
	"Logistics & Distribution",
	"Other",
] as const;

export type Sector = (typeof SECTORS)[number];

// Equipment slugs from src/data/equipment-types.json, plus the form-only "spare-parts".
// "catchweigher" is intentionally omitted: the form offers only "checkweigher".
// "miscellaneous" is shown as "Software" (no accessories).
export const EQUIPMENT_SLUGS = [
	"checkweigher",
	"track-and-trace",
	"metal-detectors",
	"x-ray-inspection",
	"miscellaneous",
	"spare-parts",
] as const;

export type EquipmentSlug = (typeof EQUIPMENT_SLUGS)[number];
