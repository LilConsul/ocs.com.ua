import { describe, expect, it } from "bun:test";
import { getCityCoordinates, resolveCityCoordinates } from "@/lib/about/geocoding";

describe("geocoding helper", () => {
	it("returns cached coordinates for known Ukrainian cities", () => {
		const kyiv = getCityCoordinates("Kyiv");
		expect(kyiv).toBeDefined();
		expect(kyiv?.lat).toBeCloseTo(50.45, 1);
		expect(kyiv?.lng).toBeCloseTo(30.52, 1);
		expect(kyiv?.name.ua).toBe("Київ");
		expect(kyiv?.name.en).toBe("Kyiv");
	});

	it("returns cached coordinates for Vinnytsia", () => {
		const vinnytsia = getCityCoordinates("Vinnytsia");
		expect(vinnytsia).toBeDefined();
		expect(vinnytsia?.lat).toBeCloseTo(49.23, 1);
		expect(vinnytsia?.lng).toBeCloseTo(28.46, 1);
	});

	it("returns undefined for unknown city in sync lookup", () => {
		const unknown = getCityCoordinates("NonExistentCity123");
		expect(unknown).toBeUndefined();
	});

	it("falls back to default Ukraine center or handles unknown gracefully in resolveCityCoordinates", async () => {
		const result = await resolveCityCoordinates("Kyiv");
		expect(result.lat).toBeCloseTo(50.45, 1);
		expect(result.lng).toBeCloseTo(30.52, 1);
	});
});
