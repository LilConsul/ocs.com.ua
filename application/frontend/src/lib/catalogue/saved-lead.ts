import { SECTORS } from "../contact/options";

// Remembers the visitor's lead details on this device so the datasheet form is prefilled next time.
// Nothing here is sent anywhere; the server validates the form as usual when it is submitted.

export const STORAGE_KEY = "ocs.lead.v1";
export const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

const FIELDS = ["name", "jobTitle", "company", "phone", "email", "sector"] as const;

export type SavedLead = Record<(typeof FIELDS)[number], string>;

type LeadStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The saved details, or null when nothing usable is stored (missing, expired, corrupt, blocked). */
export function loadLead(store: LeadStore, now = Date.now()): SavedLead | null {
	try {
		const raw = store.getItem(STORAGE_KEY);
		if (!raw) return null;

		const parsed: unknown = JSON.parse(raw);
		const record = parsed as { lead?: Record<string, unknown>; at?: unknown } | null;
		const lead = record?.lead;
		if (typeof record?.at !== "number" || typeof lead !== "object" || lead === null) return null;

		if (now - record.at > MAX_AGE_MS) {
			store.removeItem(STORAGE_KEY);
			return null;
		}
		if (!FIELDS.every((field) => typeof lead[field] === "string")) return null;

		const result = Object.fromEntries(FIELDS.map((field) => [field, lead[field]])) as SavedLead;
		// A sector removed from the list since the details were saved must be picked again
		if (!(SECTORS as readonly string[]).includes(result.sector)) result.sector = "";
		return result;
	} catch {
		return null;
	}
}

export function saveLead(store: LeadStore, lead: SavedLead, now = Date.now()): void {
	try {
		const picked = Object.fromEntries(FIELDS.map((field) => [field, lead[field]]));
		store.setItem(STORAGE_KEY, JSON.stringify({ lead: picked, at: now }));
	} catch {
		// Storage can be blocked (private mode, quota); the form simply is not prefilled next time
	}
}

export function clearLead(store: LeadStore): void {
	try {
		store.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to clear if storage is blocked
	}
}
