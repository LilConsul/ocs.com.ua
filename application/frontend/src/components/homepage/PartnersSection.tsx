import { Card, CardContent } from "@/components/ui/card";

interface Partner {
	name: { en: string; ua: string };
	website: string;
	logo: string;
}

interface PartnersByCategory {
	food: Partner[];
	household: Partner[];
	pharma: Partner[];
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
	categoryFood: string;
	categoryHousehold: string;
	categoryPharma: string;
}

interface Props {
	partnersByCategory: PartnersByCategory;
	translations: Translations;
	lang: "en" | "ua";
}

const SCROLL_SPEED = 50; // pixels per second; lower = slower, higher = faster

function PartnerScroller({
	partners,
	lang,
	reverse = false,
}: {
	partners: Partner[];
	lang: "en" | "ua";
	reverse?: boolean;
}) {
	// Exactly 2 copies + a -50% keyframe is mathematically exact: the point
	// where copy 1 ends is pixel-identical to where copy 2 begins, so there
	// is no seam to see and nothing ever needs to be re-measured or reset.
	const items = [...partners, ...partners];

	// Calculate duration based on a constant scroll speed for smooth animation
	// Approximate width per logo: 150px (logo + padding + gap)
	// Animation moves 50% of total width (because we duplicate the array)
	const approximateLogoWidth = 150;
	const totalWidth = partners.length * approximateLogoWidth;
	const duration = totalWidth / SCROLL_SPEED;

	return (
		<div
			className="border-border/50 relative w-full overflow-hidden border-y py-8"
			style={{
				WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
				maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
			}}
		>
			<div
				className={`logo-scroller flex w-fit gap-12 ${reverse ? "logo-scroller-reverse" : ""}`}
				style={{ animationDuration: `${duration}s` }}
			>
				{items.map((partner) => (
					<a
						key={partner.name[lang]}
						href={partner.website}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex h-12 shrink-0 items-center px-6 opacity-70 grayscale transition-[opacity,filter,transform] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-100 hover:drop-shadow-md hover:grayscale-0"
					>
						<img
							src={partner.logo}
							alt={partner.name[lang]}
							className="h-12 w-auto"
							loading="eager"
						/>
					</a>
				))}
			</div>
		</div>
	);
}

export function PartnersSection({ partnersByCategory, translations, lang }: Props) {
	return (
		<section className="bg-muted/50 relative overflow-hidden py-24 md:py-32">
			<div className="relative z-10 mx-auto max-w-7xl px-8">
				<div className="mb-16 text-center">
					<div className="text-primary mb-4 font-mono text-[12px] leading-4 font-medium tracking-wider uppercase">
						{translations.label}
					</div>
					<h2 className="font-heading text-foreground mb-6 text-[32px] leading-10 font-semibold tracking-tight md:text-[48px] md:leading-14 md:tracking-[-0.02em]">
						{translations.title}
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-[14px] leading-6">
						{translations.description}
					</p>
				</div>

				<div className="mb-16 space-y-0">
					<PartnerScroller partners={partnersByCategory.food} lang={lang} />
					<PartnerScroller partners={partnersByCategory.household} lang={lang} reverse={true} />
					<PartnerScroller partners={partnersByCategory.pharma} lang={lang} />
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[48px] leading-14 font-semibold tracking-[-0.02em]">
								{translations.installationsValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-4 font-medium tracking-wider uppercase">
								{translations.installations}
							</div>
							<p className="text-muted-foreground text-[14px] leading-5">
								{translations.installationsDescription}
							</p>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[48px] leading-14 font-semibold tracking-[-0.02em]">
								{translations.experienceValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-4 font-medium tracking-wider uppercase">
								{translations.experience}
							</div>
							<p className="text-muted-foreground text-[14px] leading-5">
								{translations.experienceDescription}
							</p>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card rounded-xl border p-8 shadow-sm">
						<CardContent className="p-0">
							<div className="font-heading text-primary mb-2 text-[48px] leading-14 font-semibold tracking-[-0.02em]">
								{translations.retentionValue}
							</div>
							<div className="text-muted-foreground mb-4 font-mono text-[12px] leading-4 font-medium tracking-wider uppercase">
								{translations.retention}
							</div>
							<p className="text-muted-foreground text-[14px] leading-5">
								{translations.retentionDescription}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>

			<style>{`
				@keyframes scroll {
					from { transform: translate3d(0, 0, 0); }
					to { transform: translate3d(-50%, 0, 0); }
				}
				@keyframes scrollReverse {
					from { transform: translate3d(-50%, 0, 0); }
					to { transform: translate3d(0, 0, 0); }
				}
				.logo-scroller {
					animation-name: scroll;
					animation-timing-function: linear;
					animation-iteration-count: infinite;
					will-change: transform;
				}
				.logo-scroller-reverse {
					animation-name: scrollReverse;
					animation-timing-function: linear;
					animation-iteration-count: infinite;
					will-change: transform;
				}
				.logo-scroller:hover,
				.logo-scroller-reverse:hover {
					animation-play-state: paused;
				}
				@media (prefers-reduced-motion: reduce) {
					.logo-scroller,
					.logo-scroller-reverse {
						animation: none !important;
						flex-wrap: wrap;
						justify-content: center;
					}
				}
			`}</style>
		</section>
	);
}
