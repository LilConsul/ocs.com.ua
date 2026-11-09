import { describe, expect, it } from "bun:test";
import {
	clearLead,
	loadLead,
	MAX_AGE_MS,
	type SavedLead,
	saveLead,
} from "@/lib/catalogue/saved-lead";

const lead: SavedLead = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
};

const NOW = 1_800_000_000_000;

function fakeStore(initial: Record<string, string> = {}) {
	const data = { ...initial };
	return {
		data,
		getItem: (key: string) => data[key] ?? null,
		setItem: (key: string, value: string) => {
			data[key] = value;
		},
		removeItem: (key: string) => {
			delete data[key];
		},
	};
}

const throwingStore = {
	getItem: () => {
		throw new Error("blocked");
	},
	setItem: () => {
		throw new Error("blocked");
	},
	removeItem: () => {
		throw new Error("blocked");
	},
};

describe("saved lead", () => {
	it("returns null when nothing is saved", () => {
		expect(loadLead(fakeStore(), NOW)).toBeNull();
	});

	it("round-trips the six lead fields", () => {
		const store = fakeStore();
		saveLead(store, lead, NOW);
		expect(loadLead(store, NOW + 1000)).toEqual(lead);
	});

	it("stores nothing but the lead fields and the save time", () => {
		const store = fakeStore();
		saveLead(store, { ...lead, website: "spam", recaptchaToken: "t" } as SavedLead, NOW);
		const stored = JSON.parse(Object.values(store.data)[0]);
		expect(Object.keys(stored).sort()).toEqual(["at", "lead"]);
		expect(Object.keys(stored.lead).sort()).toEqual(Object.keys(lead).sort());
	});

	it("is valid until just before 180 days and expired after", () => {
		const store = fakeStore();
		saveLead(store, lead, NOW);
		expect(loadLead(store, NOW + MAX_AGE_MS - 1)).toEqual(lead);
		expect(loadLead(store, NOW + MAX_AGE_MS + 1)).toBeNull();
	});

	it("drops an expired record from storage", () => {
		const store = fakeStore();
		saveLead(store, lead, NOW);
		loadLead(store, NOW + MAX_AGE_MS + 1);
		expect(Object.keys(store.data)).toHaveLength(0);
	});

	it("treats corrupt or wrongly shaped data as nothing saved", () => {
		const key = (() => {
			const s = fakeStore();
			saveLead(s, lead, NOW);
			return Object.keys(s.data)[0];
		})();
		for (const bad of [
			"{nope",
			"null",
			"42",
			"[]",
			JSON.stringify({ at: NOW }),
			JSON.stringify({ lead, at: "yesterday" }),
			JSON.stringify({ lead: { ...lead, name: 5 }, at: NOW }),
			JSON.stringify({ lead: { name: "x" }, at: NOW }),
		]) {
			expect(loadLead(fakeStore({ [key]: bad }), NOW)).toBeNull();
		}
	});

	it("falls back to an empty sector when the saved one is no longer allowed", () => {
		const store = fakeStore();
		saveLead(store, { ...lead, sector: "Mining" }, NOW);
		expect(loadLead(store, NOW)).toEqual({ ...lead, sector: "" });
	});

	it("clearLead removes the record", () => {
		const store = fakeStore();
		saveLead(store, lead, NOW);
		clearLead(store);
		expect(loadLead(store, NOW)).toBeNull();
	});

	it("never throws when storage is blocked", () => {
		expect(loadLead(throwingStore, NOW)).toBeNull();
		expect(() => saveLead(throwingStore, lead, NOW)).not.toThrow();
		expect(() => clearLead(throwingStore)).not.toThrow();
	});
});
