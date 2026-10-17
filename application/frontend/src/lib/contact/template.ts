// Minimal Jinja-style renderer: replaces {{ name }} placeholders in a single pass.
// Unknown variables render as empty strings. Values are never re-scanned for placeholders.
export function render(
	template: string,
	vars: Record<string, string>,
	transform: (value: string) => string = (value) => value
): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) =>
		transform(vars[key] ?? "")
	);
}
