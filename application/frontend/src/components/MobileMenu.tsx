import { Mail, MapPin, Menu, Phone } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavigationContent, SiteConfig } from "@/types/content";

interface MobileMenuProps {
	navigation: NavigationContent["header"];
	currentPath: string;
	siteConfig: SiteConfig;
}

export function MobileMenu({ navigation, currentPath, siteConfig }: MobileMenuProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
					<Menu className="size-5" />
				</Button>
			</SheetTrigger>

			<SheetContent side="left" className="w-75 sm:w-87.5 p-6 flex flex-col">
				<SheetHeader>
					<SheetTitle className="text-left">Menu</SheetTitle>
				</SheetHeader>

				<nav className="flex flex-col gap-1 mt-6" aria-label="Mobile navigation">
					{navigation.menu.map((item) => {
						const isActive = currentPath === item.url;

						return (
							<a
								key={item.url}
								href={item.url}
								onClick={() => setOpen(false)}
								className={cn(
									"px-4 py-3 rounded-md text-sm font-medium tracking-wide uppercase transition-colors",
									isActive
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent hover:text-primary"
								)}
								aria-current={isActive ? "page" : undefined}
							>
								{item.label}
							</a>
						);
					})}
				</nav>

				<Separator className="my-6" />

				<div className="flex flex-col gap-3 text-sm">
					<a
						href={`tel:${siteConfig.contact.phone}`}
						className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
					>
						<Phone className="size-4" />
						{siteConfig.contact.phone}
					</a>

					<a
						href={`mailto:${siteConfig.contact.email}`}
						className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
					>
						<Mail className="size-4" />
						{siteConfig.contact.email}
					</a>

					<a
						href={`https://maps.google.com/?q=${encodeURIComponent(
							siteConfig.contact.address.street +
								" " +
								siteConfig.contact.address.city +
								" " +
								siteConfig.contact.address.country
						)}`}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
					>
						<MapPin className="size-4" />
						{siteConfig.contact.address.city}, {siteConfig.contact.address.country}
					</a>
				</div>

				<div className="mt-auto pt-6">
					<LanguageSwitcher />
				</div>
			</SheetContent>
		</Sheet>
	);
}
