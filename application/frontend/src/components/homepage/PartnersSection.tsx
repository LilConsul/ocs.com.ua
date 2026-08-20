import { Card, CardContent } from "@/components/ui/card";

interface Partner {
	name: string;
	website: string;
	logo: string;
}

interface Translations {
	label: string;
	title: string;
	description: string;
	installations: string;
	installationsValue: string;
	installationsDescription: string;
	experience: string;
	experienceValue: string;
	experienceDescription: string;
	retention: string;
	retentionValue: string;
	retentionDescription: string;
}

interface Props {
	partners: Partner[];
	translations: Translations;
}

export function PartnersSection({ partners, translations }: Props) {
	// Duplicate partners array for seamless infinite scroll
	const duplicatedPartners = [...partners, ...partners];

	return (
		<section className="bg-muted/50 relative overflow-hidden py-24 md:py-32">
			<div className="relative z-10 mx-auto max-w-7xl px-8">
				<div className="mb-16 text-center">
					<div className="text-primary mb-4 font-mono text-[12px] leading-[16px] font-medium tracking-[0.05em] uppercase">
						{translations.label}
					</div>
					<h2 className="font-heading text-foreground mb-6 text-[40px] leading-[48px] font-semibold tracking-tight md:text-[64px] md:leading-[72px] md:tracking-[-0.02em]">
						{translations.title}
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-[18px] leading-[28px]">
						{translations.description}
					</p>
				</div>

				{/* Logo Scroller */}
				<div className="border-border/50 relative mb-24 w-full overflow-hidden border-y py-12">
					<div className="logo-scroller flex w-fit gap-12">
						{duplicatedPartners.map((partner, index) => (
							<a
								key={`${partner.name}-${index}`}
								href={partner.website}
								target="_blank"
								rel="noopener noreferrer"
								className="flex h-12 shrink-0 items-center px-6 opacity-70 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0"
							>
								<img src={partner.logo} alt={partner.name} className="h-12 w-auto" loading="lazy" />
							</a>
						))}
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[64px] leading-[72px] font-semibold tracking-[-0.02em]">
								{translations.installationsValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-[16px] font-medium tracking-[0.05em] uppercase">
								{translations.installations}
							</div>
							<p className="text-muted-foreground text-[16px] leading-[24px]">
								{translations.installationsDescription}
							</p>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[64px] leading-[72px] font-semibold tracking-[-0.02em]">
								{translations.experienceValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-[16px] font-medium tracking-[0.05em] uppercase">
								{translations.experience}
							</div>
							<p className="text-muted-foreground text-[16px] leading-[24px]">
								{translations.experienceDescription}
							</p>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[64px] leading-[72px] font-semibold tracking-[-0.02em]">
								{translations.retentionValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-[16px] font-medium tracking-[0.05em] uppercase">
								{translations.retention}
							</div>
							<p className="text-muted-foreground text-[16px] leading-[24px]">
								{translations.retentionDescription}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>

			<style>{`
				@keyframes scroll {
					0% {
						transform: translateX(0);
					}
					100% {
						transform: translateX(-50%);
					}
				}
				.logo-scroller {
					animation: scroll 30s linear infinite;
				}
				.logo-scroller:hover {
					animation-play-state: paused;
				}
			`}</style>
		</section>
	);
}
