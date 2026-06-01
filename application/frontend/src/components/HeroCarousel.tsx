import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/types/content";

interface HeroCarouselProps {
	slides: HeroSlide[];
}

const AUTO_ROTATE_INTERVAL_MS = 5000;

const accentClassMap: Record<string, string> = {
	blue: "from-sky-500/30 via-sky-900/40 to-slate-950/90",
	green: "from-emerald-500/30 via-emerald-900/40 to-slate-950/90",
	purple: "from-violet-500/30 via-violet-900/40 to-slate-950/90",
};

export function HeroCarousel({ slides }: HeroCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);

	useEffect(() => {
		if (safeSlides.length <= 1 || isPaused) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setCurrentIndex((previousIndex) => (previousIndex + 1) % safeSlides.length);
		}, AUTO_ROTATE_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [isPaused, safeSlides.length]);

	useEffect(() => {
		if (currentIndex >= safeSlides.length && safeSlides.length > 0) {
			setCurrentIndex(0);
		}
	}, [currentIndex, safeSlides.length]);

	if (safeSlides.length === 0) {
		return null;
	}

	const currentSlide = safeSlides[currentIndex];
	const overlayClass = accentClassMap[currentSlide.accentColor] ?? accentClassMap.blue;

	const goToSlide = (index: number) => {
		setCurrentIndex(index);
	};

	const goToPrevious = () => {
		setCurrentIndex((previousIndex) => (previousIndex - 1 + safeSlides.length) % safeSlides.length);
	};

	const goToNext = () => {
		setCurrentIndex((previousIndex) => (previousIndex + 1) % safeSlides.length);
	};

	return (
		<section
			className="relative isolate h-105 overflow-hidden md:h-150"
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			aria-label="Homepage hero carousel"
		>
			<AnimatePresence mode="wait">
				<motion.div
					key={currentSlide.id}
					initial={{ opacity: 0, x: 80 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -80 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="absolute inset-0"
				>
					<div
						className="absolute inset-0 bg-cover bg-center"
						style={{ backgroundImage: `url(${currentSlide.backgroundImage})` }}
						aria-hidden="true"
					/>
					<div
						className={cn(
							"absolute inset-0 bg-linear-to-r from-black/75 via-black/55 to-black/80",
							overlayClass
						)}
						aria-hidden="true"
					/>
					<div className="relative z-10 flex h-full items-center">
						<div className="mx-auto flex w-full max-w-7xl px-4">
							<div className="max-w-2xl space-y-6 text-white">
								<p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
									OCS Industrial Solutions
								</p>
								<h1 className="font-heading text-4xl font-semibold text-balance md:text-6xl">
									{currentSlide.title}
								</h1>
								<p className="max-w-xl text-base leading-7 text-white/80 md:text-lg">
									{currentSlide.description}
								</p>
								<Button asChild size="lg" className="min-w-48">
									<a href={currentSlide.ctaLink}>{currentSlide.ctaText}</a>
								</Button>
							</div>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>

			<div className="absolute inset-x-0 top-1/2 z-20 mx-auto flex max-w-7xl -translate-y-1/2 justify-between px-4">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="border-white/30 bg-black/30 text-white backdrop-blur hover:bg-black/50"
					onClick={goToPrevious}
					aria-label="Previous slide"
				>
					<ChevronLeft className="size-5" />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="border-white/30 bg-black/30 text-white backdrop-blur hover:bg-black/50"
					onClick={goToNext}
					aria-label="Next slide"
				>
					<ChevronRight className="size-5" />
				</Button>
			</div>

			<div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-3">
				{safeSlides.map((slide, index) => (
					<button
						key={slide.id}
						type="button"
						onClick={() => goToSlide(index)}
						className={cn(
							"h-2.5 w-10 rounded-full border border-white/30 transition-all",
							index === currentIndex ? "bg-white" : "bg-white/30 hover:bg-white/60"
						)}
						aria-label={`Go to slide ${index + 1}`}
						aria-pressed={index === currentIndex}
					/>
				))}
			</div>
		</section>
	);
}
