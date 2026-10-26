export interface Page<T> {
	items: T[];
	page: number;
	pageCount: number;
}

/** Returns one 1-based page of `items`; out-of-range pages are clamped, an empty list is one empty page. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
	const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
	const current = Math.min(Math.max(1, page), pageCount);
	const start = (current - 1) * pageSize;
	return { items: items.slice(start, start + pageSize), page: current, pageCount };
}
