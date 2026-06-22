import type { HomepageContent, NavigationContent, SiteConfig } from "@/types/content";

export async function loadContent<T>(locale: string, filename: string): Promise<T> {
	try {
		const content = await import(`../content/${locale}/${filename}.json`);
		return content.default;
	} catch (error) {
		// Fallback to English if Ukrainian content missing
		if (locale === "ua") {
			console.warn(`Content not found for ua/${filename}, falling back to en`);
			const fallback = await import(`../content/en/${filename}.json`);
			return fallback.default;
		}
		throw error;
	}
}

export async function loadHomepage(locale: string): Promise<HomepageContent> {
	return loadContent<HomepageContent>(locale, "homepage");
}

export async function loadNavigation(locale: string): Promise<NavigationContent> {
	return loadContent<NavigationContent>(locale, "navigation");
}

export async function loadSiteConfig(locale: string): Promise<SiteConfig> {
	return loadContent<SiteConfig>(locale, "site-config");
}
