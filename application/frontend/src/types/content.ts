export interface HeroSlide {
	id: string;
	title: string;
	description: string;
	ctaText: string;
	ctaLink: string;
	backgroundImage: string;
	accentColor: string;
}

export interface IndustryCard {
	id: string;
	name: string;
	description: string;
	icon: string;
	link: string;
	image: string;
}

export interface Benefit {
	icon: string;
	title: string;
	description: string;
}

export interface HomepageContent {
	hero: {
		slides: HeroSlide[];
	};
	industries: {
		title: string;
		description: string;
		cards: IndustryCard[];
	};
	featuredEquipment: {
		title: string;
		description: string;
		equipmentIds: string[];
	};
	whyChooseUs: {
		title: string;
		benefits: Benefit[];
	};
	contactForm: {
		title: string;
		description: string;
		fields: Record<string, string>;
		submitButton: string;
		successMessage: string;
		errorMessage: string;
	};
}

export interface NavigationContent {
	header: {
		logo: {
			src: string;
			alt: string;
		};
		menu: Array<{
			id: string;
			label: string;
			url: string;
		}>;
	};
	footer: {
		quickLinks: Array<{
			label: string;
			url: string;
		}>;
	};
}

export interface SiteConfig {
	company: {
		name: string;
		fullName: string;
		tagline: string;
		description: string;
	};
	contact: {
		phone: string;
		email: string;
		address: {
			street: string;
			city: string;
			country: string;
			postalCode: string;
		};
	};
	social: {
		facebook?: string;
		linkedin?: string;
		instagram?: string;
		youtube?: string;
	};
	seo: {
		title: string;
		description: string;
		keywords: string[];
		ogImage: string;
	};
	copyright: string;
}
