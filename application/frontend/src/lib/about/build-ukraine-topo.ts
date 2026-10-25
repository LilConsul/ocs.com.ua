// Builds ukraine-oblasts.topo.json (next to this file): 24 oblasts + Autonomous
// Republic of Crimea (Sevastopol is inside the Crimea polygon), simplified for web use.
//
// Source: OpenStreetMap administrative boundaries (admin_level=4) via
// github.com/EugeneBorshch/ukraine_geojson. © OpenStreetMap contributors, ODbL.
//
// Run once (output is committed), from application/frontend:
//   bun src/lib/about/build-ukraine-topo.ts [outFile]

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { Objects, Topology } from "topojson-specification";

const SOURCE =
	"https://raw.githubusercontent.com/EugeneBorshch/ukraine_geojson/master/UA_FULL_Ukraine.geojson";
const OUT =
	process.argv[2] ?? fileURLToPath(new URL("./ukraine-oblasts.topo.json", import.meta.url));
const DETAIL = 0.3; // fraction of points removed by simplification (lower = more detail)

// OSM English names differ from what we want on screen
const EN_FIX: Record<string, string> = { Kiev: "Kyiv", Odessa: "Odesa" };

interface OsmProperties {
	"name:en": string;
	"name:uk": string;
	"iso3166-2": string;
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const src = (await res.json()) as FeatureCollection<Geometry, OsmProperties>;

const features: Feature<Geometry, { en: string; uk: string }>[] = src.features.map((f) => {
	const rawEn = f.properties["name:en"]
		.replace(/ Oblast$/, "")
		.replace("Autonomous Republic of Crimea", "Crimea");
	return {
		type: "Feature",
		id: f.properties["iso3166-2"],
		properties: {
			en: EN_FIX[rawEn] ?? rawEn,
			uk: f.properties["name:uk"]
				.replace(/ область$/, "")
				.replace("Автономна Республіка Крим", "Крим"),
		},
		geometry: f.geometry,
	};
});

const collection: FeatureCollection = { type: "FeatureCollection", features };
let topo = topology({ oblasts: collection }, 1e5) as Topology<Objects<Record<never, never>>>;
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, DETAIL));
topo = quantize(topo, 1e4);

fs.writeFileSync(OUT, JSON.stringify(topo));
console.log(
	`${features.length} regions → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`
);
