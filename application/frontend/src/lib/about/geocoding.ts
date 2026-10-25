import cityCoordinatesData from "@/data/city-coordinates.json";
import type { CityCoordinate } from "./types";

const coordinatesCache: Record<string, CityCoordinate> = {
	...(cityCoordinatesData as Record<string, CityCoordinate>),
};

export function getCityCoordinates(cityName: string): CityCoordinate | undefined {
	const normalized = cityName.trim();
	return coordinatesCache[normalized];
}

export async function resolveCityCoordinates(cityName: string): Promise<CityCoordinate> {
	const cached = getCityCoordinates(cityName);
	if (cached) {
		return cached;
	}

	try {
		const query = encodeURIComponent(`${cityName}, Ukraine`);
		const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&accept-language=uk,en`;
		const response = await fetch(url, {
			headers: {
				"User-Agent": "ocs-website-build/1.0 (info@ocs.com.ua)",
			},
		});

		if (response.ok) {
			const data = (await response.json()) as Array<{
				lat: string;
				lon: string;
				display_name: string;
			}>;
			if (data && data.length > 0) {
				const resolved: CityCoordinate = {
					lat: Number.parseFloat(data[0].lat),
					lng: Number.parseFloat(data[0].lon),
					name: {
						en: cityName,
						ua: cityName,
					},
				};
				coordinatesCache[cityName] = resolved;
				return resolved;
			}
		}
	} catch {
		// Fallback gracefully on network error during build
	}

	// Safe Ukraine fallback center if geocoder is unreachable
	return {
		lat: 49.0384,
		lng: 31.4513,
		name: { en: cityName, ua: cityName },
	};
}
