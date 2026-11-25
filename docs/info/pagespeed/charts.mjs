// Draws the charts of docs/info/pagespeed.md from data.json (medians of local Lighthouse runs).
// Run: node docs/info/pagespeed/charts.mjs
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL("./", import.meta.url);
const data = JSON.parse(readFileSync(new URL("data.json", here), "utf8"));

const STYLE = `<style>
svg{--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--grid:#e4e3df;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--muted:#b5b4ae}
@media (prefers-color-scheme:dark){svg{--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--grid:#383835;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--muted:#6b6a65}}
text{font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;fill:var(--ink2)}
.title{font-size:16px;font-weight:600;fill:var(--ink)}
.value{fill:var(--ink);font-weight:600}
.grid{stroke:var(--grid);stroke-width:1}
</style>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, attrs = "") => `<text x="${x}" y="${y}" ${attrs}>${esc(s)}</text>`;
const frame = (w, h, title, sub, body) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">${STYLE}<rect width="${w}" height="${h}" rx="8" style="fill:var(--surface)"/>${text(24, 32, title, 'class="title"')}${text(24, 52, sub)}${body}</svg>\n`;
const save = (name, svg) => writeFileSync(new URL(name, here), svg);
const legend = (items, x, y) => {
	let out = "";
	for (const [name, color] of items) {
		out += `<rect x="${x}" y="${y - 10}" width="12" height="12" rx="3" style="fill:var(--${color})"/>${text(x + 18, y, name)}`;
		x += 34 + name.length * 6.8;
	}
	return out;
};
// A bar square at the left baseline and rounded at its data end
const bar = (x, y, w, h, color, tip, round = true) => {
	const r = round ? Math.min(4, w) : 0;
	return `<path d="M${x} ${y}h${Math.max(0, w - r)}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${-Math.max(0, w - r)}z" style="fill:var(--${color})"><title>${esc(tip)}</title></path>`;
};

// 1. LCP of the home page after each step
{
	const W = 900;
	const row = 30;
	const top = 80;
	const H = top + data.steps.length * row + 20;
	const x0 = 210;
	const scale = (W - x0 - 190) / Math.max(...data.steps.map((s) => s.lcp));
	let b = "";
	data.steps.forEach((s, i) => {
		const yy = top + i * row;
		const before = i ? data.steps[i - 1].lcp : s.lcp;
		const diff = (s.lcp - before) / 1000;
		b += text(x0 - 12, yy + 14, `${s.no}  ${s.name}`, 'text-anchor="end"');
		b += bar(x0, yy, s.lcp * scale, 20, "s1", `${s.name}: ${(s.lcp / 1000).toFixed(2)} s`);
		b += text(x0 + s.lcp * scale + 8, yy + 14, `${(s.lcp / 1000).toFixed(1)} s`, 'class="value"');
		// Differences under 0.15 s are within the noise of the lab
		if (diff <= -0.15) b += text(x0 + s.lcp * scale + 48, yy + 14, `${diff.toFixed(1).replace("-", "−")} s`);
	});
	save("lcp-by-step.svg", frame(W, H, "Largest Contentful Paint of the Ukrainian home page after each step", "Mobile, lab, median of 3 runs. Lower is better.", b));
}

// 2. What the home page downloads before any interaction
{
	const W = 900;
	const row = 30;
	const top = 110;
	const H = top + data.steps.length * row + 30;
	const keys = [["Fonts", "s1"], ["Images", "s2"], ["HTML, CSS, JS", "s3"], ["Plerdy", "s4"]];
	const max = Math.max(...data.steps.map((s) => keys.reduce((n, [k]) => n + s.weight[k], 0)));
	const x0 = 210;
	const scale = (W - x0 - 90) / max;
	let b = legend(keys, 24, 80);
	data.steps.forEach((s, i) => {
		const yy = top + i * row;
		b += text(x0 - 12, yy + 14, `${s.no}  ${s.name}`, 'text-anchor="end"');
		let xx = x0;
		let total = 0;
		const present = keys.filter(([k]) => s.weight[k] * scale > 0.5);
		present.forEach(([k, c], j) => {
			const w = s.weight[k] * scale;
			total += s.weight[k];
			b += bar(xx, yy, Math.max(1, w - (j < present.length - 1 ? 2 : 0)), 20, c, `${s.name}: ${k} ${Math.round(s.weight[k])} KB`, j === present.length - 1);
			xx += w;
		});
		b += text(xx + 8, yy + 14, `${Math.round(total)} KB`, 'class="value"');
	});
	save("weight-by-step.svg", frame(W, H, "What the Ukrainian home page downloads before any interaction", "Mobile, transferred KB by kind. Lower is better.", b));
}

// 3. Scores before and after, per page
for (const [file, key, title] of [["accessibility.svg", "a11y", "Accessibility score, before and after"], ["lcp-pages.svg", "lcp", "Largest Contentful Paint per page, before and after"]]) {
	const W = 900;
	const row = 34;
	const top = 112;
	const H = top + data.pages.length * row + 50;
	const [x0, x1] = [150, 820];
	const score = key === "a11y";
	const lo = score ? 80 : 0;
	const hi = score ? 100 : Math.ceil(Math.max(...data.pages.map((p) => p.before.lcp)) / 1000);
	const val = (p) => (score ? p.a11y : p.lcp / 1000);
	const x = (v) => x0 + ((x1 - x0) * (v - lo)) / (hi - lo);
	const fmt = (v) => (score ? String(v) : `${v.toFixed(1)} s`);
	let b = legend([["Before", "muted"], ["After", "s1"]], 24, 80);
	const bottom = top + data.pages.length * row;
	for (let t = lo; t <= hi; t += score ? 5 : 1)
		b += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${top - 12}" y2="${bottom - 10}"/>${text(x(t), bottom + 10, score ? t : `${t} s`, 'text-anchor="middle"')}`;
	data.pages.forEach((p, i) => {
		const yy = top + i * row + 6;
		const [v0, v1] = [val(p.before), val(p.after)];
		const dir = v1 >= v0 ? 1 : -1;
		b += text(x0 - 22, yy + 4, p.name, 'text-anchor="end"');
		b += `<line x1="${x(v0)}" x2="${x(v1)}" y1="${yy}" y2="${yy}" style="stroke:var(--grid);stroke-width:4;stroke-linecap:round"/>`;
		for (const [v, c, n] of [[v0, "muted", "before"], [v1, "s1", "after"]])
			b += `<circle cx="${x(v)}" cy="${yy}" r="6" style="fill:var(--${c});stroke:var(--surface);stroke-width:2"><title>${esc(`${p.name}, ${n}: ${fmt(v)}`)}</title></circle>`;
		if (Math.abs(x(v1) - x(v0)) > 30 || v0 === v1) {
			if (v0 !== v1) b += text(x(v0) - 12 * dir, yy + 4, fmt(v0), `text-anchor="${dir > 0 ? "end" : "start"}"`);
		}
		b += text(x(v1) + 12 * dir, yy + 4, fmt(v1), `class="value" text-anchor="${dir > 0 ? "start" : "end"}"`);
	});
	save(file, frame(W, H, title, score ? "Mobile, lab. 100 is the maximum; the axis starts at 80." : "Mobile, lab. Lower is better.", b));
}
