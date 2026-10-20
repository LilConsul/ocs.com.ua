import { dirname, resolve } from "node:path";
import { file, plugin } from "bun";

// Tests run on Bun, but production builds run on Vite, which supports `import x from "./file?raw"`.
// This mirrors that behaviour so the same imports work under `bun test`.
plugin({
	name: "raw-import",
	setup(build) {
		build.onResolve({ filter: /\?raw$/ }, (args) => ({
			path: resolve(dirname(args.importer), args.path.slice(0, -"?raw".length)),
			namespace: "raw",
		}));
		build.onLoad({ filter: /.*/, namespace: "raw" }, async (args) => ({
			contents: `export default ${JSON.stringify(await file(args.path).text())};`,
			loader: "js",
		}));
	},
});
