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
			className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
				scrolled
					? "bg-background/80 border-border border-b shadow-sm backdrop-blur-xl"
					: "bg-background/70 backdrop-blur-md"
			}`}
		>
			<nav className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-8">
				{/* Company Name */}
				<a href={`/${currentLang}`} className="text-foreground transition-opacity hover:opacity-80">
					<span className="font-heading text-xl font-bold tracking-tight">
						{currentLang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна"}
					</span>
				</a>

				{/* Desktop Navigation */}
				<div className="hidden items-center gap-8 md:flex">
					{navLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
						>
							{link.label}
						</a>
					))}
				</div>

				{/* Right Side Actions */}
				<div className="flex items-center gap-4">
					{/* Language Switcher - Desktop */}
					<div className="bg-muted/50 border-border/50 hidden items-center gap-1 rounded-lg border p-1 md:flex">
						{languageOptions.map((lang) => (
							<button
								key={lang.code}
								type="button"
								onClick={() => switchLanguage(lang.code)}
								className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
									currentLang === lang.code
										? "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground hover:bg-background/50"
								} `}
							>
								<span className="text-base leading-none">{lang.flag}</span>
								<span className="font-mono text-xs tracking-wider uppercase">{lang.code}</span>
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
						{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</Button>
				</div>
			</nav>

			{/* Mobile Menu */}
			{mobileMenuOpen && (
				<div className="border-border bg-background/95 border-t backdrop-blur-xl md:hidden">
					<div className="space-y-4 px-8 py-6">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="text-muted-foreground hover:text-foreground block py-2 text-base font-medium transition-colors"
								onClick={() => setMobileMenuOpen(false)}
							>
								{link.label}
							</a>
						))}

						<div className="border-border space-y-2 border-t pt-4">
							<div className="text-muted-foreground mb-3 font-mono text-xs uppercase">
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
									className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
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
