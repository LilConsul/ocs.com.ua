export const languages = {
	en: 'English',
	ua: 'Українська',
};

export const defaultLang = 'ua';

export const ui = {
	en: {
		'site.title': 'Hello World',
		'home.title': 'Hello World!',
		'home.description': 'This is the English version of the page',
		'home.switchLanguage': 'Перейти на Українську',
	},
	ua: {
		'site.title': 'Привіт Світ',
		'home.title': 'Привіт Світ!',
		'home.description': 'Це українська версія сторінки',
		'home.switchLanguage': 'Switch to English',
	},
} as const;
