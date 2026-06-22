import { useTina } from "tinacms/dist/react";
import { tinaField } from "tinacms/dist/react";
import { ContactForm } from "@/components/ContactForm";
import { HeroCarousel } from "@/components/HeroCarousel";
import type { HomepageQuery } from "../../tina/__generated__/types";

interface HomepageContentProps {
	query: string;
	variables: { relativePath: string };
	data: HomepageQuery;
}

/**
 * React component that wraps homepage content with TinaCMS context
 * This enables visual editing by providing the useTina hook
 */
export function HomepageContent({ query, variables, data }: HomepageContentProps) {
	// useTina hook provides the TinaCMS context for visual editing
	const { data: tinaData } = useTina({
		query,
		variables,
		data,
	});

	const homepage = tinaData.homepage;

	if (
		!homepage ||
		!homepage.hero ||
		!homepage.industries ||
		!homepage.whyChooseUs ||
		!homepage.contactForm
	) {
		return null;
	}

	return (
		<>
			<section
				className="relative isolate h-105 overflow-hidden md:h-150"
				data-tina-field={tinaField(homepage, "hero")}
			>
				<HeroCarousel
					slides={
						(homepage.hero.slides?.filter((s): s is NonNullable<typeof s> => s !== null) ||
							[]) as any
					}
				/>
			</section>

			{/* Industries Section */}
			<section className="py-16 md:py-24" data-tina-field={tinaField(homepage, "industries")}>
				<div className="mx-auto max-w-7xl px-4">
					<div className="mx-auto mb-12 max-w-3xl space-y-4 text-center">
						<p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
							Industries
						</p>
						<h2
							className="font-heading text-3xl font-semibold md:text-4xl"
							data-tina-field={tinaField(homepage.industries, "title")}
						>
							{homepage.industries.title}
						</h2>
						<p
							className="text-base text-muted-foreground md:text-lg"
							data-tina-field={tinaField(homepage.industries, "description")}
						>
							{homepage.industries.description}
						</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{homepage.industries.cards?.filter(Boolean).map((card, index) => (
							<div
								key={card!.id}
								className="h-full border border-border/70 bg-background p-6"
								data-tina-field={tinaField(homepage.industries, "cards", index)}
							>
								<h3
									className="font-heading text-xl font-semibold mb-2"
									data-tina-field={tinaField(card, "name")}
								>
									{card!.name}
								</h3>
								<p
									className="text-sm text-muted-foreground"
									data-tina-field={tinaField(card, "description")}
								>
									{card!.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Why Choose Us Section */}
			<section className="py-16 md:py-24" data-tina-field={tinaField(homepage, "whyChooseUs")}>
				<div className="mx-auto max-w-7xl px-4">
					<div className="mx-auto mb-12 max-w-3xl space-y-4 text-center">
						<p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Why OCS</p>
						<h2
							className="font-heading text-3xl font-semibold md:text-4xl"
							data-tina-field={tinaField(homepage.whyChooseUs, "title")}
						>
							{homepage.whyChooseUs.title}
						</h2>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
						{homepage.whyChooseUs.benefits?.filter(Boolean).map((benefit, index) => (
							<div
								key={index}
								className="flex h-full flex-col gap-4 border border-border/70 bg-background p-6 text-center"
								data-tina-field={tinaField(homepage.whyChooseUs, "benefits", index)}
							>
								<h3
									className="font-heading text-xl font-semibold"
									data-tina-field={tinaField(benefit, "title")}
								>
									{benefit!.title}
								</h3>
								<p
									className="text-sm leading-7 text-muted-foreground"
									data-tina-field={tinaField(benefit, "description")}
								>
									{benefit!.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Contact Form */}
			<ContactForm content={homepage.contactForm as any} />
		</>
	);
}
