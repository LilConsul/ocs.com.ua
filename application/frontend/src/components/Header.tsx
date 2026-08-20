import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
	currentLang: "en" | "ua";
	translations: {
		catalogue: string;
		solutions: string;
		industries: string;
		about: string;
		language: string;
	};
}

export function Header({ currentLang, translations }: HeaderProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const navLinks = [
		{ href: `/${currentLang}#catalogue`, label: translations.catalogue },
		{ href: `/${currentLang}#solutions`, label: translations.solutions },
		{ href: `/${currentLang}#industries`, label: translations.industries },
		{ href: `/${currentLang}#about`, label: translations.about },
	];

	const languageOptions = [
		{
			code: "en",
			name: "English",
			flag: "🇬🇧",
		},
		{
			code: "ua",
			name: "Українська",
			flag: "🇺🇦",
		},
	];

	const switchLanguage = (newLang: string) => {
		// Get current path without language prefix
		const currentPath = window.location.pathname;
		const pathWithoutLang = currentPath.replace(/^\/(en|ua)/, "");
		// Navigate to new language
		window.location.href = `/${newLang}${pathWithoutLang}`;
	};

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				scrolled
					? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
					: "bg-background/70 backdrop-blur-md"
			}`}
		>
			<nav className="max-w-[1280px] mx-auto px-8 h-20 flex items-center justify-between">
				{/* Company Name */}
				<a href={`/${currentLang}`} className="text-foreground hover:opacity-80 transition-opacity">
					<span className="font-heading font-bold text-xl tracking-tight">
						{currentLang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна"}
					</span>
				</a>

				{/* Desktop Navigation */}
				<div className="hidden md:flex items-center gap-8">
					{navLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							{link.label}
						</a>
					))}
				</div>

				{/* Right Side Actions */}
				<div className="flex items-center gap-4">
					{/* Language Switcher - Desktop */}
					<div className="hidden md:flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
						{languageOptions.map((lang) => (
							<button
								key={lang.code}
								type="button"
								onClick={() => switchLanguage(lang.code)}
								className={`
									px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
									flex items-center gap-1.5
									${
										currentLang === lang.code
											? "bg-primary text-primary-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-background/50"
									}
								`}
							>
								<span className="text-base leading-none">{lang.flag}</span>
								<span className="font-mono text-xs uppercase tracking-wider">{lang.code}</span>
							</button>
						))}
					</div>

					{/* Mobile Menu Toggle */}
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
					</Button>
				</div>
			</nav>

			{/* Mobile Menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
					<div className="px-8 py-6 space-y-4">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="block py-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => setMobileMenuOpen(false)}
							>
								{link.label}
							</a>
						))}

						<div className="pt-4 border-t border-border space-y-2">
							<div className="text-xs font-mono uppercase text-muted-foreground mb-3">
								{translations.language}
							</div>
							{languageOptions.map((lang) => (
								<button
									key={lang.code}
									type="button"
									onClick={() => {
										switchLanguage(lang.code);
										setMobileMenuOpen(false);
									}}
									className={`flex items-center gap-3 w-full py-2 px-3 rounded-lg transition-colors ${
										currentLang === lang.code
											? "bg-accent text-accent-foreground"
											: "hover:bg-accent/50"
									}`}
								>
									<span className="text-xl">{lang.flag}</span>
									<span className="font-medium">{lang.name}</span>
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
