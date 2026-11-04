import companyData from "@/data/company.json";
import documentsData from "@/data/documents.json";
import equipmentTypes from "@/data/equipment-types.json";
import industriesData from "@/data/industries.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { existingFile } from "../public-assets";
import { absUrl, organizationId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

/** Maps Schema.org full day names to their two-letter RFC 5545 abbreviations. */
const DAY_ABBR: Record<string, string> = {
	Monday: "Mo",
	Tuesday: "Tu",
	Wednesday: "We",
	Thursday: "Th",
	Friday: "Fr",
	Saturday: "Sa",
	Sunday: "Su",
};

/**
 * Converts structured openingHours to the Schema.org LocalBusiness string format.
 * e.g. ["Monday","Friday"] + "09:00" + "18:00" → "Mo Fr 09:00-18:00"
 */
function toOpeningHoursString(days: string[], opens: string, closes: string): string {
	const abbrs = days.map((d) => DAY_ABBR[d] ?? d.slice(0, 2));
	return `${abbrs.join(" ")} ${opens}-${closes}`;
}

export function organizationSchema(lang: Lang, site: SiteOrigin): SchemaNode {
	const _ = getInlineTranslations(lang);
	const address = companyData.address[lang as "en" | "ua"] ?? companyData.address.en;
	const contactPerson =
		companyData.contactPerson[lang as "en" | "ua"] ?? companyData.contactPerson.en;
	const companyName = companyData.name[lang as "en" | "ua"] ?? companyData.name.en;
	const geo = companyData.geo ?? { latitude: 50.4578, longitude: 30.4024 };
	const hours = companyData.openingHours ?? {
		days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
		opens: "09:00",
		closes: "18:00",
	};

	const wipotecPdf = existingFile(documentsData.wipotec);
	const mesutronicPdf = existingFile(documentsData.mesutronic);
	const credentials = [
		wipotecPdf
			? {
					"@type": "EducationalOccupationalCredential",
					name: _("WIPOTEC Official Distributor Authorization"),
					url: absUrl(wipotecPdf, site),
				}
			: null,
		mesutronicPdf
			? {
					"@type": "EducationalOccupationalCredential",
					name: _("MESUTRONIC Authorized Distributor Certificate"),
					url: absUrl(mesutronicPdf, site),
				}
			: null,
	].filter(Boolean);

	return {
		"@type": ["Organization", "LocalBusiness"],
		"@id": organizationId(site),
		name: companyName,
		url: absUrl(`/${lang}/`, site),
		logo: absUrl("/apple-touch-icon.png", site),
		email: companyData.email,
		telephone: companyData.phone,
		address: {
			"@type": "PostalAddress",
			streetAddress: address.office ? `${address.street}, ${address.office}` : address.street,
			addressLocality: address.city,
			postalCode: address.postalCode,
			addressCountry: "UA",
		},
		geo: {
			"@type": "GeoCoordinates",
			latitude: geo.latitude,
			longitude: geo.longitude,
		},
		openingHoursSpecification: {
			"@type": "OpeningHoursSpecification",
			dayOfWeek: hours.days,
			opens: hours.opens,
			closes: hours.closes,
		},
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "sales",
			name: contactPerson.name,
			telephone: companyData.phone,
			email: companyData.email,
			areaServed: "UA",
			availableLanguage: ["uk", "en"],
		},
		knowsAbout: [
			// Compliances & Regulatory Directives
			"HACCP Food Safety Compliance",
			"IFS and BRC Certification",
			"FDA Protocol Compliant",
			"GMP Pharmaceutical Quality Standards",
			"FDA 21 CFR Part 11 Compliance (Electronic Records & Signatures)",
			"Machinery Directive 2006/42/EC",
			"Electromagnetic Compatibility (EMC) Directive 2014/30/EU",
			"RoHS Directive 2011/65/EU (Restriction of Hazardous Substances)",
			"EU Regulation (EC) No 1935/2004 (Food Contact Materials)",
			"EU Regulation (EC) No 2023/2006 (Good Manufacturing Practice for Food Contact Materials)",
			"EU Regulation No 10/2011 (Plastic Food Contact Materials)",

			// Manufacturer-specific product lines
			"WIPOTEC Electromagnetic Force Compensation Checkweighers",
			"WIPOTEC X-Ray Inspection Systems",
			"WIPOTEC Track & Trace Serialization and Aggregation",
			"MESUTRONIC Meatline Pipeline Metal Detection",
			"MESUTRONIC Quicktron Gravity-Fall Contaminant Separators",
			"MESUTRONIC Metron Conveyor Metal Detection",

			// Equipment types and industries it is used for, says in sync with CMS
			...equipmentTypes.en.categories.map((c) => c.title),
			...industriesData.en.industries.map((i) => i.title),
		],
		hasCredential: credentials.length > 0 ? (credentials as unknown as SchemaNode[]) : undefined,
		areaServed: {
			"@type": "Country",
			name: "Ukraine",
		},
		openingHours: toOpeningHoursString(hours.days, hours.opens, hours.closes),
		priceRange: companyData.priceRange || undefined,
		sameAs: companyData.sameAs.length > 0 ? companyData.sameAs : undefined,
	};
}
