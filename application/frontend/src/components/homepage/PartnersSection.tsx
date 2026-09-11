import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const PIXELS_PER_SECOND = 30;

function wrap(value: number, max: number): number {
	let result = value % max;
	if (result < 0) {
		result += max;
	}
	return result;
}

function PartnerScroller({
	partners,
	lang,
	reverse = false,
	startOffsetRatio = 0,
}: {
	partners: Partner[];
	lang: "en" | "ua";
	reverse?: boolean;
	startOffsetRatio?: number;
}) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const offsetRef = useRef(0);
	const setWidthRef = useRef(0);
	const [copies, setCopies] = useState(2);
	const [ready, setReady] = useState(false);

	const hasInitializedOffsetRef = useRef(false);

	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		const track = trackRef.current;
		if (!(wrapper && track)) return;

		const measure = () => {
			const singleSet = wrapper.querySelector<HTMLDivElement>("[data-set='0']");
			if (!singleSet) return;
			const singleSetWidth = singleSet.scrollWidth;
			if (singleSetWidth === 0) return;

			const previousWidth = setWidthRef.current;
			setWidthRef.current = singleSetWidth;

			const needed = Math.max(2, Math.ceil((wrapper.offsetWidth * 2) / singleSetWidth) + 1);
			setCopies((prev) => (prev === needed ? prev : needed));

			if (!hasInitializedOffsetRef.current) {
				// Only place the marquee at its starting position on the very
				// first successful measurement.
				offsetRef.current = singleSetWidth * startOffsetRatio;
				hasInitializedOffsetRef.current = true;
			} else if (previousWidth > 0 && previousWidth !== singleSetWidth) {
				// A later resize (window resize, DevTools toggle, zoom, orientation
				// change) changed the row's width. Rescale the current offset
				// proportionally instead of snapping back to startOffsetRatio —
				// that snap-back was the visible "jump" during playback.
				offsetRef.current = (offsetRef.current / previousWidth) * singleSetWidth;
			}

			// Write the transform here, synchronously, before the browser paints.
			// Doing this in a plain useEffect instead would paint one frame at
			// translateX(0) first, then jump to the real starting offset on the
			// next frame — exactly the kind of visible jump this is meant to
			// eliminate, and it was most noticeable right on page load since
			// startOffsetRatio intentionally starts each row partway through
			// its loop rather than at 0.
			track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;

			setReady(true);
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(wrapper);
		return () => ro.disconnect();
	}, [partners.length, startOffsetRatio]);

	useEffect(() => {
		if (!ready) return;
		const track = trackRef.current;
		const wrapper = wrapperRef.current;
		if (!(track && wrapper)) return;

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let rafId: number;
		let last = performance.now();
		let paused = false;

		const io = new IntersectionObserver(
			([entry]) => {
				paused = !entry.isIntersecting;
				last = performance.now();
			},
			{ threshold: 0 }
		);
		io.observe(wrapper);

		const tick = (now: number) => {
			// Cap dt: if the tab was backgrounded or throttled, requestAnimationFrame
			// can skip seconds between frames. Without this cap, the next tick
			// would jump the offset forward by that entire gap in one frame.
			const dt = Math.min((now - last) / 1000, 0.1);
			last = now;
			const setWidth = setWidthRef.current;

			if (!paused && setWidth > 0) {
				const dir = reverse ? -1 : 1;
				offsetRef.current = wrap(offsetRef.current + dir * PIXELS_PER_SECOND * dt, setWidth);
				track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
			}

			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(rafId);
			io.disconnect();
		};
	}, [ready, reverse]);

	return (
		<div
			ref={wrapperRef}
			className="border-border/50 relative w-full overflow-hidden border-y py-8"
			style={{
				WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
				maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
			}}
		>
			<div
				ref={trackRef}
				className="flex w-max gap-12 motion-reduce:flex-wrap motion-reduce:justify-center"
				style={{ willChange: "transform", backfaceVisibility: "hidden" }}
			>
				{Array.from({ length: copies }).map((_, copyIndex) => (
					<div key={copyIndex} data-set={copyIndex} className="flex shrink-0 gap-12">
						{partners.map((partner) => (
							<a
								key={partner.name[lang]}
								href={partner.website}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex h-12 w-37.5 shrink-0 items-center justify-center opacity-70 grayscale transition-[opacity,filter,transform] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-100 hover:drop-shadow-md hover:grayscale-0"
							>
								<img
									src={partner.logo}
									alt={partner.name[lang]}
									className="h-12 max-w-full object-contain"
									loading="eager"
									decoding="async"
								/>
							</a>
						))}
					</div>
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
					<PartnerScroller partners={partnersByCategory.food} lang={lang} startOffsetRatio={0.15} />
					<PartnerScroller
						partners={partnersByCategory.household}
						lang={lang}
						reverse
						startOffsetRatio={0.6}
					/>
					<PartnerScroller
						partners={partnersByCategory.pharma}
						lang={lang}
						startOffsetRatio={0.35}
					/>
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
		</section>
	);
}
