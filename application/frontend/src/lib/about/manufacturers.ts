import documentsData from "@/data/documents.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { existingFile } from "@/lib/public-assets";

export interface Manufacturer {
	id: string;
	name: string;
	location: string;
	mapUrl: string;
	websiteUrl: string;
	websiteLabel: string;
	description: string;
	details: string;
	features: string[];
	/** Distributor authorization PDF in public/, undefined when the file is missing */
	pdfUrl: string | undefined;
}

/** The manufacturers OCS distributes, shared by the About page and its Markdown copy. */
export function getManufacturers(lang: Lang): Manufacturer[] {
	const _ = getInlineTranslations(lang);
	return [
		{
			id: "wipotec",
			name: "WIPOTEC GmbH",
			location: "Kaiserslautern, Germany",
			mapUrl: "https://maps.app.goo.gl/ZqNMtgiGWXLLzL8Y6",
			websiteUrl: "https://www.wipotec.com",
			websiteLabel: "wipotec.com",
			description: _(
				"Dynamic checkweighers with electromagnetic force compensation technology, X-Ray scanners, and Track & Trace serialization and aggregation systems for the pharmaceutical industry."
			),
			details: _(
				"Weighing and inspection systems have been a quality standard for over 30 years, and 95% of components are developed and manufactured in-house in one location in Kaiserslautern."
			),
			features: [
				_("High-precision dynamic checkweighers (up to 600 - 1000 pcs/min)"),
				_("High-resolution industrial X-Ray scanners"),
				_("Track & Trace serialization and aggregation systems"),
			],
			pdfUrl: existingFile(documentsData.wipotec),
		},
		{
			id: "mesutronic",
			name: "MESUTRONIC Gerätebau GmbH",
			location: "Kirchberg im Wald, Germany",
			mapUrl: "https://maps.app.goo.gl/7Xa7imQJKJw3Lagi8",
			websiteUrl: "https://www.mesutronic.de",
			websiteLabel: "mesutronic.de",
			description: _(
				"Metal detectors for food and pharmaceutical production lines. They detect ferrous, non-ferrous and stainless steel contaminants."
			),
			details: _(
				"MESUTRONIC Gerätebau GmbH develops and manufactures metal detectors in Kirchberg im Wald, Germany."
			),
			features: [
				_("Meatline & Pipeline Metal Inspection For Pumped Products"),
				_("Quicktron & Pharma Freefall Gravity Contaminant Separators"),
				_("Metron FlatLine & Transtron High-Sensitivity Conveyor Systems"),
			],
			pdfUrl: existingFile(documentsData.mesutronic),
		},
	];
}
