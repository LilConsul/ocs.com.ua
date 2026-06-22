import client from "../../tina/__generated__/client";

/**
 * Load homepage content through Tina CMS
 * Enables visual editing when authenticated
 */
export async function loadHomepageWithTina(locale: string) {
	try {
		const response = await client.queries.homepage({
			relativePath: `${locale}/homepage.json`,
		});

		return {
			data: response.data.homepage,
			query: response.query,
			variables: response.variables,
		};
	} catch (error) {
		console.error(`Failed to load homepage for ${locale}:`, error);
		// Fallback to direct import if Tina fails
		const fallback = await import(`../content/${locale}/homepage.json`);
		return {
			data: fallback.default,
			query: null,
			variables: null,
		};
	}
}

/**
 * Load navigation content through Tina CMS
 */
export async function loadNavigationWithTina(locale: string) {
	try {
		const response = await client.queries.navigation({
			relativePath: `${locale}/navigation.json`,
		});

		return {
			data: response.data.navigation,
			query: response.query,
			variables: response.variables,
		};
	} catch (error) {
		console.error(`Failed to load navigation for ${locale}:`, error);
		const fallback = await import(`../content/${locale}/navigation.json`);
		return {
			data: fallback.default,
			query: null,
			variables: null,
		};
	}
}

/**
 * Load site config through Tina CMS
 */
export async function loadSiteConfigWithTina(locale: string) {
	try {
		const response = await client.queries.siteConfig({
			relativePath: `${locale}/site-config.json`,
		});

		return {
			data: response.data.siteConfig,
			query: response.query,
			variables: response.variables,
		};
	} catch (error) {
		console.error(`Failed to load site config for ${locale}:`, error);
		const fallback = await import(`../content/${locale}/site-config.json`);
		return {
			data: fallback.default,
			query: null,
			variables: null,
		};
	}
}
