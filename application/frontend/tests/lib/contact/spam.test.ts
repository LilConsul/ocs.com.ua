import { describe, expect, it } from "bun:test";
import {
	getClientIp,
	hasExcessiveLinks,
	hasSpamKeywords,
	isDisposableEmail,
	isFastSubmission,
	isSpamSubmission,
} from "@/lib/contact/spam";

describe("getClientIp", () => {
	it("extracts the first IP from X-Forwarded-For header", () => {
		const req = new Request("http://localhost:4321", {
			headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
		});
		expect(getClientIp(req, "127.0.0.1")).toBe("203.0.113.195");
	});

	it("falls back to clientAddress when X-Forwarded-For is missing", () => {
		const req = new Request("http://localhost:4321");
		expect(getClientIp(req, "198.51.100.4")).toBe("198.51.100.4");
	});

	it("returns unknown when no IP is available", () => {
		const req = new Request("http://localhost:4321");
		expect(getClientIp(req, undefined)).toBe("unknown");
	});
});

describe("isFastSubmission (time-trap)", () => {
	const NOW = 1_700_000_000_000;

	it("flags submission faster than 3 seconds", () => {
		expect(isFastSubmission(NOW - 1500, 3000, 86_400_000, NOW)).toBe(true);
	});

	it("allows submission after 3 seconds", () => {
		expect(isFastSubmission(NOW - 4000, 3000, 86_400_000, NOW)).toBe(false);
	});

	it("flags submission older than 24 hours (stale form)", () => {
		expect(isFastSubmission(NOW - 90_000_000, 3000, 86_400_000, NOW)).toBe(true);
	});

	it("flags missing or invalid timestamp", () => {
		expect(isFastSubmission(undefined, 3000, 86_400_000, NOW)).toBe(true);
		expect(isFastSubmission("invalid", 3000, 86_400_000, NOW)).toBe(true);
		expect(isFastSubmission(NOW + 5000, 3000, 86_400_000, NOW)).toBe(true); // future timestamp
	});
});

describe("isDisposableEmail", () => {
	it("detects known disposable email providers", () => {
		expect(isDisposableEmail("spammer@mailinator.com")).toBe(true);
		expect(isDisposableEmail("bot@temp-mail.org")).toBe(true);
		expect(isDisposableEmail("test@10minutemail.com")).toBe(true);
		expect(isDisposableEmail("anon@guerrillamail.com")).toBe(true);
		expect(isDisposableEmail("fake@yopmail.com")).toBe(true);
	});

	it("allows standard and corporate email domains", () => {
		expect(isDisposableEmail("engineer@farmak.ua")).toBe(false);
		expect(isDisposableEmail("director@company.com.ua")).toBe(false);
		expect(isDisposableEmail("client@gmail.com")).toBe(false);
	});
});

describe("hasExcessiveLinks", () => {
	it("detects messages with more than 2 links", () => {
		const spam = "Check https://site1.com and https://site2.com and also http://site3.com";
		expect(hasExcessiveLinks(spam, 2)).toBe(true);
	});

	it("allows messages with 0, 1, or 2 links", () => {
		expect(hasExcessiveLinks("We need equipment for our plant.", 2)).toBe(false);
		expect(hasExcessiveLinks("Our website is https://company.ua", 2)).toBe(false);
		expect(hasExcessiveLinks("See https://a.com and https://b.com", 2)).toBe(false);
	});
});

describe("hasSpamKeywords", () => {
	it("detects common English spam keywords and SEO pitches", () => {
		expect(hasSpamKeywords("Buy cheap crypto investment now")).toBe(true);
		expect(hasSpamKeywords("Best online casino bonus")).toBe(true);
		expect(hasSpamKeywords("Improve your Google ranking with high DA backlinks")).toBe(true);
		expect(hasSpamKeywords("Buy generic viagra online")).toBe(true);
	});

	it("detects Ukrainian / Cyrillic spam keywords", () => {
		expect(hasSpamKeywords("Онлайн казино з бонусом за реєстрацію")).toBe(true);
		expect(hasSpamKeywords("Пропонуємо розкрутка сайту та купити посилання")).toBe(true);
		expect(hasSpamKeywords("Швидкий заробіток на криптовалюті")).toBe(true);
		expect(hasSpamKeywords("Кращі слоти та ігрові автомати без депозиту")).toBe(true);
		expect(hasSpamKeywords("Кредит онлайн без відмов")).toBe(true);
	});

	it("allows legitimate industrial inquiries in Ukrainian and English", () => {
		expect(hasSpamKeywords("Потрібна комерційна пропозиція на чеквеєр HC-A для фарм лінії.")).toBe(
			false
		);
		expect(
			hasSpamKeywords("We require checkweighers with 0.1g accuracy for pharmaceutical packaging.")
		).toBe(false);
		expect(
			hasSpamKeywords(
				"Цікавить система контролю ваги та металодетектор для кондитерського виробництва."
			)
		).toBe(false);
	});
});

describe("isSpamSubmission", () => {
	const validData = {
		name: "Oleksii Kovalenko",
		jobTitle: "Chief Engineer",
		company: "Farmak",
		phone: "+380501234567",
		email: "o.kovalenko@farmak.ua",
		sector: "Food Industry",
		equipment: ["checkweigher"],
		message: "Need a quote for checkweighers.",
		website: "",
		loadedAt: Date.now() - 10000,
	};

	it("returns false for legitimate inquiry", () => {
		expect(isSpamSubmission(validData)).toBe(false);
	});

	it("flags honeypot filled", () => {
		expect(isSpamSubmission({ ...validData, website: "http://bot.example" })).toBe(true);
	});

	it("flags fast submission", () => {
		expect(isSpamSubmission({ ...validData, loadedAt: Date.now() - 500 })).toBe(true);
	});

	it("flags disposable email", () => {
		expect(isSpamSubmission({ ...validData, email: "bot@mailinator.com" })).toBe(true);
	});

	it("flags message with too many links", () => {
		expect(
			isSpamSubmission({
				...validData,
				message: "Visit https://1.com https://2.com https://3.com",
			})
		).toBe(true);
	});

	it("flags spam keywords", () => {
		expect(
			isSpamSubmission({
				...validData,
				message: "Get best crypto casino profits today",
			})
		).toBe(true);
	});
});
