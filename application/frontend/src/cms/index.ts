import CMS from "decap-cms-app";
import { categorySlugsListener } from "./category-slugs";
import { patchGithubRecursiveMedia } from "./github-media";
import { IconControl, IconPreview } from "./icon-select";

// Material Symbols font for the icon-select widget (also injected into the preview iframe)
const MATERIAL_SYMBOLS_URL =
	"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";

// Normalize bullet lists to '-' on save (remark@10 compatible)
CMS.registerRemarkPlugin({ settings: { bullet: "-" } } as never);

CMS.registerPreviewStyle(MATERIAL_SYMBOLS_URL, { raw: false });

CMS.registerWidget("icon-select", IconControl, IconPreview);

CMS.registerEventListener(categorySlugsListener);

patchGithubRecursiveMedia(CMS);

// Config is loaded from <link rel="cms-config-url"> in the page
CMS.init();
