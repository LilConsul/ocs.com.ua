import { describe, expect, it } from "bun:test";
import { renderMarkdown, renderMarkdownSync } from "@/lib/render-markdown";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml and renderMarkdown", () => {
	it("strips raw script tags and their content", () => {
		const dirty = 'Hello <script>alert("xss")</script> World';
		expect(sanitizeHtml(dirty)).toBe("Hello  World");
	});

	it("strips script tags with attributes and external sources", () => {
		const dirty = '<script src="https://evil.com/malicious.js" type="text/javascript"></script>';
		expect(sanitizeHtml(dirty)).toBe("");
	});

	it("strips iframe, embed, and object elements", () => {
		const dirty =
			'<p>Test</p><iframe src="https://evil.com"></iframe><object data="test"></object><embed src="test">';
		expect(sanitizeHtml(dirty)).toBe("<p>Test</p>");
	});

	it("strips inline event handlers like onerror and onload", () => {
		const dirty = '<img src="/assets/image.webp" onerror="alert(1)" onload="evil()">';
		const clean = sanitizeHtml(dirty);
		expect(clean).toContain('src="/assets/image.webp"');
		expect(clean).not.toContain("onerror");
		expect(clean).not.toContain("onload");
		expect(clean).not.toContain("alert");
	});

	it("strips javascript: and vbscript: URIs", () => {
		const dirty = '<a href="javascript:alert(1)">Click Me</a><a href="vbscript:msgbox(1)">Bad</a>';
		const clean = sanitizeHtml(dirty);
		expect(clean).not.toContain("javascript:");
		expect(clean).not.toContain("vbscript:");
		expect(clean).not.toContain("alert");
	});

	it("preserves safe markdown HTML elements", () => {
		const safe = "<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em>.</p>";
		expect(sanitizeHtml(safe)).toBe(safe);
	});

	it("sanitizes markdown output in renderMarkdown", async () => {
		const markdown = `
# Product Details

This is a **safe** product description.

<script>window.location='https://attacker.com'</script>

[Malicious Link](javascript:alert('pwned'))
`;
		const html = await renderMarkdown(markdown);
		expect(html).toContain("<h1>Product Details</h1>");
		expect(html).toContain("<strong>safe</strong>");
		expect(html).not.toContain("<script>");
		expect(html).not.toContain("attacker.com");
		expect(html).not.toContain("javascript:");
	});

	it("sanitizes markdown synchronously in renderMarkdownSync", () => {
		const markdown = 'Section text <img src="x" onerror="alert(1)">';
		const html = renderMarkdownSync(markdown);
		expect(html).toContain("<p>Section text");
		expect(html).not.toContain("onerror");
		expect(html).not.toContain("alert(1)");
	});
});
