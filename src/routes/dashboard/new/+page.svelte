<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight, Grid2X2, List, Sparkles } from '@lucide/svelte';
	import CatalogItemModal from '$lib/components/ui/CatalogItemModal.svelte';
	import ItemCard from '$lib/components/ui/ItemCard.svelte';
	import { ensureProxiedUrl } from '$lib/utils/b2ImageProxy.js';

	interface Arrival {
		id: number;
		catalogId: string;
		title: string;
		author: string | null;
		year: number | string | null;
		category: string | null;
		coverImage: string | null;
		publisher?: string | null;
		isbn?: string | null;
		edition?: string | null;
		pages?: number | null;
		language?: string | null;
		issn?: string | null;
		volume?: string | null;
		issueNumber?: string | null;
		advisor?: string | null;
		department?: string | null;
		description?: string | null;
		pdfAvailable?: boolean;
		totalCopies: number;
		availableCopies: number;
		isReserved: boolean;
		isBorrowed: boolean;
		itemType: 'book' | 'journal' | 'magazine' | 'thesis';
		createdAt: string | null;
	}

	let arrivals: Arrival[] = [];
	let selectedArrival: Arrival | null = null;
	let viewType: 'grid' | 'list' = 'grid';
	let loading = true;
	let errorMessage = '';
	let actionError = '';
	let activeActionKey: string | null = null;
	let activeAction: 'request' | 'cancel' | null = null;
	let currentPage = 1;
	let totalPages = 1;
	let totalItems = 0;
	const PAGE_SIZE = 12;

	function itemKey(item: Arrival) {
		return `${item.itemType}:${item.id}`;
	}

	function itemTypeLabel(itemType: Arrival['itemType']) {
		if (itemType === 'thesis') return 'Research';
		return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}

	function itemDetails(item: Arrival) {
		if (item.itemType === 'book') {
			return [
				{ label: 'Publisher', value: item.publisher },
				{ label: 'ISBN', value: item.isbn, mono: true },
				{ label: 'Edition', value: item.edition },
				{ label: 'Pages', value: item.pages },
				{ label: 'Language', value: item.language }
			];
		}

		if (item.itemType === 'magazine' || item.itemType === 'journal') {
			return [
				{ label: 'ISSN', value: item.issn, mono: true },
				{ label: 'Volume', value: item.volume },
				{ label: 'Issue', value: item.issueNumber },
				{ label: 'Language', value: item.language }
			];
		}

		return [
			{ label: 'Department', value: item.department },
			{ label: 'Advisor', value: item.advisor }
		];
	}

	function updateReservation(item: Arrival, isReserved: boolean) {
		arrivals = arrivals.map((arrival) =>
			itemKey(arrival) === itemKey(item) ? { ...arrival, isReserved } : arrival
		);
		if (selectedArrival && itemKey(selectedArrival) === itemKey(item)) {
			selectedArrival = { ...selectedArrival, isReserved };
		}
	}

	async function requestCopy(item: Arrival) {
		const key = itemKey(item);
		if (activeActionKey) return;
		activeActionKey = key;
		activeAction = 'request';
		actionError = '';
		const today = new Date();
		const dueDate = new Date(today);
		dueDate.setDate(dueDate.getDate() + 14);
		const toDate = (date: Date) => date.toISOString().slice(0, 10);

		try {
			const response = await fetch('/api/books/transaction', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId: item.id,
					itemType: item.itemType,
					requestType: 'reserve',
					requestedBorrowDate: toDate(today),
					requestedDueDate: toDate(dueDate)
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to request this item');
			updateReservation(item, true);
		} catch (cause) {
			actionError = cause instanceof Error ? cause.message : 'Unable to request this item';
		} finally {
			activeActionKey = null;
			activeAction = null;
		}
	}

	async function cancelRequest(item: Arrival) {
		const key = itemKey(item);
		if (activeActionKey) return;
		activeActionKey = key;
		activeAction = 'cancel';
		actionError = '';
		try {
			const response = await fetch('/api/books/transaction/cancel_reserve', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId: item.id, itemType: item.itemType })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to cancel this request');
			updateReservation(item, false);
		} catch (cause) {
			actionError = cause instanceof Error ? cause.message : 'Unable to cancel this request';
		} finally {
			activeActionKey = null;
			activeAction = null;
		}
	}

	async function loadArrivals(page = 1) {
		loading = true;
		errorMessage = '';
		currentPage = page;
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
			const response = await fetch(`/api/catalog/new-arrivals?${params}`, { credentials: 'include' });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to load new arrivals');
			arrivals = result.data.arrivals;
			totalItems = result.data.pagination.totalItems;
			totalPages = Math.max(1, result.data.pagination.totalPages);
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Unable to load new arrivals';
			arrivals = [];
			totalItems = 0;
			totalPages = 1;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadArrivals();
	});
</script>

<svelte:head>
	<title>New Arrivals | I-Kalibro</title>
	<meta name="description" content="Recently added books, journals, magazines, and research works." />
</svelte:head>

<main class="w-full space-y-2 text-sm" style="color:#2C1A0E;">
	<header class="relative overflow-hidden rounded-xl border px-3 py-3 shadow-sm sm:px-5 sm:py-3.5" style="background:linear-gradient(135deg,#3A6B3A 0%,#0D5C29 50%,#1A4D1A 100%);border-color:#1A4D1A;">
		<div class="pointer-events-none absolute inset-0 opacity-10" style="background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 11px);"></div>
		<div class="relative z-10 flex items-center gap-3">
			<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border-2" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);">
				<Sparkles class="h-5 w-5 text-white" strokeWidth={1.5} aria-hidden="true" />
			</div>
			<div class="min-w-0 flex-1">
				<h1 class="text-lg font-bold leading-tight text-[#F5F0E8] sm:text-xl">New Arrivals</h1>
				<p class="mt-0.5 hidden text-xs text-white/70 sm:block sm:text-sm">Recently added across the library collection</p>
			</div>
			<div class="flex flex-shrink-0 gap-0.5 rounded-lg border p-0.5" style="background:rgba(0,0,0,.2);border-color:rgba(255,255,255,.15);" role="group" aria-label="Arrival view">
				<button type="button" on:click={() => viewType = 'grid'} aria-label="Grid view" aria-pressed={viewType === 'grid'} class="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-bold sm:px-3" style={viewType === 'grid' ? 'background:#F5F0E8;color:#0D5C29;' : 'color:rgba(245,240,232,.65);'}>
					<Grid2X2 class="h-3.5 w-3.5" aria-hidden="true" /><span class="hidden sm:inline">Grid</span>
				</button>
				<button type="button" on:click={() => viewType = 'list'} aria-label="List view" aria-pressed={viewType === 'list'} class="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-bold sm:px-3" style={viewType === 'list' ? 'background:#F5F0E8;color:#0D5C29;' : 'color:rgba(245,240,232,.65);'}>
					<List class="h-3.5 w-3.5" aria-hidden="true" /><span class="hidden sm:inline">List</span>
				</button>
			</div>
		</div>
	</header>

	{#if errorMessage}
		<div class="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert"><span class="flex-1">{errorMessage}</span><button class="text-xs font-bold underline" on:click={() => loadArrivals(currentPage)}>Retry</button></div>
	{:else if loading}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{#each Array(10) as _}<div class="h-56 animate-pulse rounded-xl border" style="background:#F5F0E8;border-color:#D4C4A8;"></div>{/each}</div>
	{:else if arrivals.length === 0}
		<div class="rounded-xl border px-3 py-12 text-center" style="background:#F5F0E8;border-color:#D4C4A8;"><div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border-2" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;"><svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z"/></svg></div><h2 class="text-base font-bold" style="color:#2C1A0E;">No recent additions</h2><p class="mt-1 text-sm" style="color:#9A7A5A;">New catalog records will appear here.</p></div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2" style="background:#F5F0E8;border-color:#D4C4A8;">
			<p class="text-sm" style="color:#7A5A2A;"><strong style="color:#2C1A0E;">{totalItems}</strong> recent records</p>
		</div>
		{#if actionError}<div class="rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert">{actionError}</div>{/if}
		{#if viewType === 'grid'}
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each arrivals as item (`${item.itemType}-${item.id}`)}
					<ItemCard
						title={item.title}
						author={item.author ?? ''}
						year={item.year}
						subtitle={item.category}
						coverImageUrl={ensureProxiedUrl(item.coverImage)}
						availableCopies={item.availableCopies}
						totalCopies={item.totalCopies}
						isReserved={item.isReserved}
						isBorrowed={item.isBorrowed}
						coverLabel={itemTypeLabel(item.itemType)}
						reference={item.catalogId}
						allowUnavailableRequest={true}
						requesting={activeActionKey === itemKey(item) && activeAction === 'request'}
						cancelling={activeActionKey === itemKey(item) && activeAction === 'cancel'}
						busy={activeAction !== null}
						requestLabel="Reserve"
						onRequest={() => { void requestCopy(item); }}
						onCancel={() => { void cancelRequest(item); }}
						onSelect={() => { selectedArrival = item; }}
					/>
				{/each}
			</div>
		{:else}
			<div class="overflow-hidden rounded-xl border" style="background:#FDF8F0;border-color:#D4C4A8;">
				<div class="overflow-x-auto">
					<table class="w-full min-w-[760px] border-collapse">
						<thead><tr style="background:#EDE4D4;border-bottom:1px solid #D4C4A8;">
							<th class="px-3 py-3 text-left text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Item</th>
							<th class="px-3 py-3 text-left text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Type</th>
							<th class="px-3 py-3 text-left text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Contributor</th>
							<th class="px-3 py-3 text-left text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Added</th>
							<th class="px-3 py-3 text-left text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Copies</th>
							<th class="px-3 py-3 text-center text-xs font-bold uppercase sm:px-4" style="color:#7A5A2A;">Action</th>
						</tr></thead>
						<tbody>
							{#each arrivals as item (`${item.itemType}-${item.id}`)}
								{@const key = itemKey(item)}
								<tr style="border-bottom:1px solid #EDE4D4;">
									<td class="px-3 py-2.5 sm:px-4">
										<div class="flex min-w-0 items-center gap-3">
											<div class="h-12 w-9 flex-shrink-0 overflow-hidden rounded" style="background:#E8DED0;">
												{#if ensureProxiedUrl(item.coverImage)}<img src={ensureProxiedUrl(item.coverImage)} alt="" class="h-full w-full object-cover" loading="lazy" />{:else}<div class="flex h-full items-center justify-center text-[9px] font-bold text-white" style="background:#0D5C29;">{itemTypeLabel(item.itemType).slice(0, 1)}</div>{/if}
											</div>
											<div class="min-w-0">
												<button type="button" class="line-clamp-2 text-left text-sm font-semibold" style="color:#1A3A1A;" on:click={() => { selectedArrival = item; }}>{item.title}</button>
												<p class="truncate text-[10px]" style="color:#9A7A5A;">{item.catalogId}</p>
											</div>
										</div>
									</td>
									<td class="px-3 py-2.5 text-xs sm:px-4">{itemTypeLabel(item.itemType)}</td>
									<td class="px-3 py-2.5 text-xs sm:px-4">{item.author || 'Not listed'}</td>
									<td class="px-3 py-2.5 text-xs sm:px-4">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
									<td class="px-3 py-2.5 text-xs tabular-nums sm:px-4">{item.availableCopies}/{item.totalCopies}</td>
									<td class="px-3 py-2.5 sm:px-4">
										{#if item.isBorrowed}<span class="block text-center text-xs font-semibold" style="color:#0D5C29;">Borrowed</span>
										{:else if item.isReserved}<button type="button" class="w-full text-xs font-semibold underline" disabled={activeAction !== null} on:click={() => { void cancelRequest(item); }}>Cancel request</button>
										{:else}<button type="button" class="w-full rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style="background:#0D5C29;" disabled={activeAction !== null} on:click={() => { void requestCopy(item); }}>{activeActionKey === key && activeAction === 'request' ? 'Sending…' : 'Reserve'}</button>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
		{#if totalPages > 1}
			<nav class="flex items-center justify-center gap-2" aria-label="New arrivals pages">
				<button type="button" class="flex h-9 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-40" style="background:#F5F0E8;border-color:#D4C4A8;" disabled={currentPage <= 1 || loading} on:click={() => { void loadArrivals(currentPage - 1); }}><ChevronLeft class="h-4 w-4" aria-hidden="true" />Previous</button>
				<span class="text-xs tabular-nums" style="color:#7A5A2A;">Page {currentPage} of {totalPages}</span>
				<button type="button" class="flex h-9 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-40" style="background:#F5F0E8;border-color:#D4C4A8;" disabled={currentPage >= totalPages || loading} on:click={() => { void loadArrivals(currentPage + 1); }}>Next<ChevronRight class="h-4 w-4" aria-hidden="true" /></button>
			</nav>
		{/if}
	{/if}
</main>

{#if selectedArrival}
	<CatalogItemModal
		title={selectedArrival.title}
		itemType={itemTypeLabel(selectedArrival.itemType)}
		catalogId={selectedArrival.catalogId}
		contributor={selectedArrival.author ?? ''}
		contributorLabel={selectedArrival.itemType === 'magazine' || selectedArrival.itemType === 'journal' ? 'Published by' : 'by'}
		category={selectedArrival.category}
		year={selectedArrival.year}
		details={itemDetails(selectedArrival)}
		summary={selectedArrival.description}
		summaryLabel={selectedArrival.itemType === 'thesis' ? 'Abstract' : 'Description'}
		coverUrl={ensureProxiedUrl(selectedArrival.coverImage)}
		accent={selectedArrival.itemType === 'magazine' ? '#B06A00' : selectedArrival.itemType === 'journal' ? '#1E6091' : selectedArrival.itemType === 'thesis' ? '#5B3D8A' : '#0D5C29'}
		availableCopies={selectedArrival.availableCopies}
		totalCopies={selectedArrival.totalCopies}
		pdfUrl={selectedArrival.itemType === 'thesis' && selectedArrival.pdfAvailable ? `/api/research/${selectedArrival.id}/pdf` : null}
		pdfFileName={`${selectedArrival.catalogId}.pdf`}
		isReserved={selectedArrival.isReserved}
		isBorrowed={selectedArrival.isBorrowed}
		actionLoading={activeActionKey === itemKey(selectedArrival)}
		onClose={() => { selectedArrival = null; }}
		onReserve={() => { if (selectedArrival) void requestCopy(selectedArrival); }}
		onCancelReserve={() => { if (selectedArrival) void cancelRequest(selectedArrival); }}
	/>
{/if}
