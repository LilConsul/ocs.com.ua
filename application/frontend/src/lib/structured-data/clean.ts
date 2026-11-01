import type { JsonValue } from "./types";

/**
 * Recursively cleans Schema.org objects:
 * - Drops keys with undefined or null values
 * - Drops keys with empty arrays
 * - Cleans nested objects and arrays
 */
export function cleanSchema<T extends JsonValue>(value: T): T {
	if (value === null || value === undefined) {
		return undefined as unknown as T;
	}

	if (Array.isArray(value)) {
		const cleanedArray = value
			.map((item) => cleanSchema(item))
			.filter((item) => item !== undefined && item !== null);
		return (cleanedArray.length > 0 ? cleanedArray : undefined) as unknown as T;
	}

	if (typeof value === "object") {
		const cleanedObj: Record<string, JsonValue> = {};
		for (const [k, v] of Object.entries(value)) {
			const cleanedVal = cleanSchema(v as JsonValue);
			if (cleanedVal !== undefined && cleanedVal !== null) {
				cleanedObj[k] = cleanedVal;
			}
		}
		return cleanedObj as unknown as T;
	}

	return value;
}
