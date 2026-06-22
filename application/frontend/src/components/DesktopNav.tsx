import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import type { NavigationContent } from "@/types/content";

interface DesktopNavProps {
	navigation: NavigationContent["header"];
	currentPath: string;
}

export function DesktopNav({ navigation, currentPath }: DesktopNavProps) {
	return (
		<ButtonGroup className="w-full justify-center">
			{navigation.menu.map((item) => {
				const isActive = currentPath === item.url;

				return (
					<Button
						key={item.id}
						variant="default"
						size="lg"
						className="flex-1 text-xs tracking-[0.06em] uppercase"
						asChild
					>
						<a href={item.url} aria-current={isActive ? "page" : undefined}>
							{item.label}
						</a>
					</Button>
				);
			})}
		</ButtonGroup>
	);
}
