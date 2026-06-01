import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";

type Locale = "ua" | "en";

interface LanguageSwitcherProps {
	className?: string;
}

function getLocaleFromPath(pathname: string): Locale {
	return pathname.startsWith("/en") ? "en" : "ua";
}

function getAlternatePath(pathname: string, currentLocale: Locale): string {
	if (currentLocale === "ua") {
		return pathname.startsWith("/ua")
			? pathname.replace(/^\/ua/, "/en")
			: `/en${pathname}`;
	}

	return pathname.startsWith("/en")
		? pathname.replace(/^\/en/, "/ua")
		: `/ua${pathname}`;
}

export function LanguageSwitcher({
	className,
}: LanguageSwitcherProps) {
	const [currentLocale, setCurrentLocale] = useState<Locale>("ua");

	useEffect(() => {
		setCurrentLocale(getLocaleFromPath(window.location.pathname));
	}, []);

	const toggleLanguage = () => {
		const pathname = window.location.pathname;
		const nextPath = getAlternatePath(pathname, currentLocale);

		window.location.href = nextPath;
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={toggleLanguage}
			className={className}
			aria-label={
				currentLocale === "ua"
					? "Switch language to English"
					: "Перемкнути мову на українську"
			}
		>
			<Globe data-icon="inline-start" className="size-4" />
			<span>{currentLocale === "ua" ? "EN" : "UA"}</span>
		</Button>
	);
}

// Made with Bob
