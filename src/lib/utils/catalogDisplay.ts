export function getCatalogPageNumbers(current: number, total: number): number[] {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
	if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
	return [1, -1, current - 1, current, current + 1, -1, total];
}

export function getCatalogStatusStyle(
	status: string | undefined,
	isReserved: boolean,
	isBorrowed: boolean
): string {
	if (isBorrowed) return 'background:#0D5C29;color:#fff;';
	if (isReserved) return 'background:#B06A00;color:#fff;';
	if (status === 'Available') return 'background:#0D5C29;color:#fff;';
	if (status === 'Limited') return 'background:#B06A00;color:#fff;';
	return 'background:#7A6A5A;color:#fff;';
}

export function getCatalogFillBarStyle(item: { availableCopies: number }): string {
	if (item.availableCopies > 5) return 'background:#0D5C29;';
	if (item.availableCopies > 0) return 'background:#B06A00;';
	return 'background:#C4B8A8;';
}