import type CMS from "decap-cms-app";

interface ListedFile {
	id: string;
	name: string;
	size: number;
	path: string;
}

/**
 * The media library lists only top-level files by default; images live in per-product
 * sub-folders (assets/equipment/<product>/), so list the media folder recursively.
 */
export function patchGithubRecursiveMedia(cms: typeof CMS) {
	const github = cms.getBackend("github");
	if (!github) return;

	const originalInit = github.init;
	github.init = (args) => {
		const backend = originalInit(args);
		backend.getMedia = async (mediaFolder?: string) => {
			const folder = mediaFolder || backend.mediaFolder;
			const files: ListedFile[] = await backend.api.listFiles(folder, { depth: 100 });
			return files.map((f) => ({
				id: f.id,
				name: f.name,
				size: f.size,
				displayURL: { id: f.id, path: f.path },
				path: f.path,
			}));
		};
		return backend;
	};
}
