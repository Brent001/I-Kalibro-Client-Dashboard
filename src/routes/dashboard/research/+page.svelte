<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import type { PageData } from './$types.js';
	import ResearchModal from '$lib/components/ui/ResearchModal.svelte';
	import ItemCard from '$lib/components/ui/ItemCard.svelte';
	import {
		getCatalogFillBarStyle as getFillBarStyle,
		getCatalogPageNumbers as getPageNumbers,
		getCatalogStatusStyle as getStatusStyle
	} from '$lib/utils/catalogDisplay.js';
	import { FileSearch, Grid2X2, List, Search, X } from '@lucide/svelte';

	export let data: PageData;

	interface Thesis {
		id: number;
		thesisId: string;
		title: string;
		author: string;
		advisor: string | null;
		department: string | null;
		publicationYear: number | null;
		abstract: string | null;
		categoryId: number | null;
		category: string | null;
		location: string | null;
		pdfAvailable: boolean;
		totalCopies: number;
		availableCopies: number;
		status?: string;
	}

	let theses: Thesis[] = [];
	let selectedThesis: Thesis | null = null;
	let searchTerm = data.initialSearch;
	let searchInputValue = data.initialSearch;
	let category = data.initialCategory;
	let year = data.initialYear;
	let currentPage = data.initialPage;
	let totalPages = 1;
	let totalItems = 0;
	let loading = false;
	let errorMessage = '';
	let actionError = '';
	let requestingId: number | null = null;
	let cancellingId: number | null = null;
	let reservedIds: number[] = [];
	let borrowedIds: number[] = [];
	let viewType: 'grid' | 'table' = 'grid';
	let showCategoryDropdown = false;
	let categoryDropdownRef: HTMLDivElement | null = null;
	let categoryTriggerRef: HTMLButtonElement | null = null;
	const PAGE_SIZE = 12;

	$: theses.forEach((thesis) => {
		thesis.status = thesis.availableCopies > 5 ? 'Available' : thesis.availableCopies > 0 ? 'Limited' : 'Unavailable';
	});

	function updateUrl() {
		if (typeof window === 'undefined') return;
		const nextUrl = new URL(window.location.href);
		if (searchTerm.trim()) nextUrl.searchParams.set('q', searchTerm.trim());
		else nextUrl.searchParams.delete('q');
		if (category !== 'all') nextUrl.searchParams.set('category', category);
		else nextUrl.searchParams.delete('category');
		if (year !== 'all') nextUrl.searchParams.set('year', year);
		else nextUrl.searchParams.delete('year');
		if (currentPage > 1) nextUrl.searchParams.set('page', String(currentPage));
		else nextUrl.searchParams.delete('page');
		replaceState(nextUrl, {});
	}

	async function loadResearch(page = 1) {
		loading = true;
		errorMessage = '';
		currentPage = page;
		updateUrl();

		const params = new URLSearchParams({
			page: String(page),
			limit: String(PAGE_SIZE),
			search: searchTerm.trim(),
			category,
			year
		});

		try {
			const response = await fetch(`/api/research?${params}`, { credentials: 'include' });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to load research records');
			theses = result.data.theses;
			totalItems = result.data.pagination.totalItems;
			totalPages = Math.max(1, result.data.pagination.totalPages);
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Unable to load research records';
			theses = [];
			totalItems = 0;
			totalPages = 1;
		} finally {
			loading = false;
		}
	}

	async function loadRequestStatus() {
		try {
			const response = await fetch('/api/books/transaction?itemType=thesis', { credentials: 'include' });
			if (!response.ok) return;
			const result = await response.json();
			borrowedIds = result.borrowedBookIds ?? [];
			reservedIds = (result.reservedBookIds ?? []).filter((id: number) => !borrowedIds.includes(id));
		} catch {
			reservedIds = [];
			borrowedIds = [];
		}
	}

	async function submitRequest(thesis: Thesis) {
		if (requestingId !== null || thesis.availableCopies < 1) return;
		requestingId = thesis.id;
		actionError = '';

		const today = new Date();
		const dueDate = new Date(today);
		dueDate.setDate(dueDate.getDate() + 14);
		const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

		try {
			const response = await fetch('/api/books/transaction', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId: thesis.id,
					itemType: 'thesis',
					requestType: 'reserve',
					requestedBorrowDate: dateOnly(today),
					requestedDueDate: dateOnly(dueDate)
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to request a print copy');
			await loadRequestStatus();
			await loadResearch(currentPage);
		} catch (cause) {
			actionError = cause instanceof Error ? cause.message : 'Unable to request a print copy';
		} finally {
			requestingId = null;
		}
	}

	async function cancelRequest(thesis: Thesis) {
		if (cancellingId !== null) return;
		cancellingId = thesis.id;
		actionError = '';
		try {
			const response = await fetch('/api/books/transaction/cancel_reserve', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId: thesis.id, itemType: 'thesis' })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to cancel this request');
			await loadRequestStatus();
		} catch (cause) {
			actionError = cause instanceof Error ? cause.message : 'Unable to cancel this request';
		} finally {
			cancellingId = null;
		}
	}

	function performSearch() {
		searchTerm = searchInputValue;
		void loadResearch(1);
	}

	function clearSearch() {
		searchTerm = '';
		searchInputValue = '';
		void loadResearch(1);
	}

	function clearFilters() {
		searchTerm = '';
		searchInputValue = '';
		category = 'all';
		year = 'all';
		void loadResearch(1);
	}

	function selectCategory(categoryId: string) {
		category = categoryId;
		showCategoryDropdown = false;
		void loadResearch(1);
	}

	function selectYear(publicationYear: string) {
		year = publicationYear;
		void loadResearch(1);
	}

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as Node;
		if (categoryDropdownRef && !categoryDropdownRef.contains(target) && categoryTriggerRef && !categoryTriggerRef.contains(target)) {
			showCategoryDropdown = false;
		}
	}

	$: pageNumbers = getPageNumbers(currentPage, totalPages);
	$: selectedCategoryName = category === 'all'
		? 'All Categories'
		: data.categories.find((item) => String(item.id) === String(category))?.name || 'All Categories';

	onMount(() => {
		void loadResearch(currentPage);
		void loadRequestStatus();
		document.addEventListener('click', handleOutsideClick);
		return () => document.removeEventListener('click', handleOutsideClick);
	});
</script>

<svelte:head>
	<title>Research Collection | I-Kalibro</title>
	<meta name="description" content="Search research titles and abstracts in the library collection." />
</svelte:head>

<div class="w-full space-y-2 text-sm" style="color:#2C1A0E;">
	<div class="relative overflow-hidden rounded-xl border px-3 py-3 shadow-sm sm:px-5 sm:py-3.5" style="background:linear-gradient(135deg,#3A6B3A 0%,#0D5C29 50%,#1A4D1A 100%);border-color:#1A4D1A;">
		<div class="pointer-events-none absolute inset-0 opacity-10" style="background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 11px);"></div>
		<div class="relative z-10 flex items-center gap-3">
			<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border-2" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);"><FileSearch class="h-5 w-5 text-white" strokeWidth={1.5} aria-hidden="true" /></div>
			<div class="min-w-0 flex-1"><h1 class="text-lg font-bold leading-tight text-[#F5F0E8] sm:text-xl">Research Catalog</h1><p class="mt-0.5 hidden text-xs text-white/70 sm:block sm:text-sm">Explore research works, abstracts, and digital documents</p></div>
			<div class="hidden flex-shrink-0 gap-0.5 rounded-lg border p-0.5 sm:flex" style="background:rgba(0,0,0,.2);border-color:rgba(255,255,255,.15);"><button on:click={() => viewType = 'grid'} type="button" class="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold" style={viewType === 'grid' ? 'background:#F5F0E8;color:#0D5C29;' : 'color:rgba(245,240,232,.65);'}><Grid2X2 class="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Grid</button><button on:click={() => viewType = 'table'} type="button" class="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold" style={viewType === 'table' ? 'background:#F5F0E8;color:#0D5C29;' : 'color:rgba(245,240,232,.65);'}><List class="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />List</button></div>
		</div>
	</div>

	<section class="rounded-xl border p-2 shadow-sm sm:p-4" style="background:#F5F0E8;border-color:#D4C4A8;">
		<form on:submit|preventDefault={performSearch} class="flex items-center gap-2"><div class="relative min-w-0 flex-1"><svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#9A7A5A;"><path stroke-linecap="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg><input type="search" placeholder="Search title, author, advisor, abstract..." bind:value={searchInputValue} disabled={loading} autocomplete="off" class="h-11 w-full rounded-lg pl-10 pr-9 text-sm focus:outline-none disabled:opacity-60" style="background:#FDF8F0;border:1.5px solid #D4C4A8;color:#2C1A0E;" />{#if searchInputValue}<button on:click={clearSearch} type="button" aria-label="Clear search" class="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full" style="background:#D4C4A8;color:#7A5A2A;"><svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg></button>{/if}</div><button type="submit" disabled={loading} class="flex h-11 flex-shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#F5F0E8] disabled:opacity-60 sm:px-5" style="background:#0D5C29;"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg><span class="hidden sm:inline">Search</span></button></form>
		<div class="mt-2 flex gap-2"><div class="relative z-40 min-w-0 flex-1"><button bind:this={categoryTriggerRef} type="button" on:click={() => showCategoryDropdown = !showCategoryDropdown} class="flex h-11 w-full items-center gap-2.5 rounded-lg border px-2 text-sm font-medium sm:px-4" style="background:#FDF8F0;border-color:#D4C4A8;color:#3A2A1A;"><span class="flex-1 truncate text-left">{selectedCategoryName}</span><svg class="h-3.5 w-3.5 flex-shrink-0 transition-transform {showCategoryDropdown ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#9A7A5A;"><path stroke-linecap="round" d="m19 9-7 7-7-7"/></svg></button>{#if showCategoryDropdown}<div bind:this={categoryDropdownRef} class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-xl border shadow-lg" style="background:#FDF8F0;border-color:#D4C4A8;">{#each [{id:'all',name:'All Categories'},...data.categories.map((item)=>({id:String(item.id),name:item.name}))] as option}<button type="button" on:click={() => selectCategory(option.id)} class="w-full border-b px-3 py-2.5 text-left text-sm last:border-0" style={option.id === category ? 'background:#EFF5EF;color:#0D5C29;font-weight:700;border-color:#D4C4A8;' : 'color:#3A2A1A;border-color:#EDE4D4;'}>{option.name}</button>{/each}</div>{/if}</div><label class="min-w-0 flex-1"><span class="sr-only">Filter by publication year</span><select bind:value={year} on:change={(event) => selectYear(event.currentTarget.value)} class="h-11 w-full rounded-lg border px-2 text-sm sm:px-4" style="background:#FDF8F0;border-color:#D4C4A8;color:#3A2A1A;"><option value="all">Any year</option>{#each data.years as itemYear (itemYear)}<option value={String(itemYear)}>{itemYear}</option>{/each}</select></label><div class="flex flex-shrink-0 gap-0.5 rounded-lg border p-0.5 sm:hidden" style="background:#FDF8F0;border-color:#D4C4A8;"><button on:click={() => viewType = 'grid'} aria-label="Grid view" class="rounded-md px-2.5 py-2" style={viewType === 'grid' ? 'background:#0D5C29;color:white;' : 'color:#9A7A5A;'}><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button><button on:click={() => viewType = 'table'} aria-label="List view" class="rounded-md px-2.5 py-2" style={viewType === 'table' ? 'background:#0D5C29;color:white;' : 'color:#9A7A5A;'}><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg></button></div></div>
		<div class="mt-2 flex items-center justify-between gap-2 border-t pt-2" style="border-color:#D4C4A8;color:#7A5A2A;"><p class="flex min-w-0 flex-wrap items-center gap-2 text-sm"><strong style="color:#2C1A0E;">{totalItems.toLocaleString()}</strong> research works{#if searchTerm}<span class="rounded-md border px-2 py-1 text-xs font-semibold" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;">{searchTerm}</span>{/if}{#if category !== 'all'}<span class="rounded-md border px-2 py-1 text-xs font-semibold" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;">{selectedCategoryName}</span>{/if}{#if year !== 'all'}<span class="rounded-md border px-2 py-1 text-xs font-semibold" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;">{year}</span>{/if}</p>{#if searchTerm || category !== 'all' || year !== 'all'}<button on:click={clearFilters} type="button" class="flex-shrink-0 text-xs font-medium underline underline-offset-2" style="color:#9A7A5A;">Clear all</button>{/if}</div>
	</section>

	{#if actionError || errorMessage}<div class="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert"><span class="flex-1">{actionError || errorMessage}</span><button on:click={() => { actionError = ''; errorMessage = ''; void loadResearch(currentPage); }} aria-label="Dismiss error"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg></button></div>{/if}
	{#if loading}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{#each Array(PAGE_SIZE) as _}<div class="overflow-hidden rounded-xl border" style="background:#F5F0E8;border-color:#D4C4A8;"><div class="h-40 animate-pulse sm:h-48" style="background:#E8DED0;"></div><div class="space-y-2 p-2"><div class="h-3 w-4/5 animate-pulse rounded" style="background:#E8DED0;"></div><div class="h-3 w-3/5 animate-pulse rounded" style="background:#E8DED0;"></div><div class="mt-2 h-8 animate-pulse rounded" style="background:#E8DED0;"></div></div></div>{/each}</div>
	{:else if theses.length === 0}
		<div class="rounded-xl border px-3 py-12 text-center" style="background:#F5F0E8;border-color:#D4C4A8;"><div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border-2" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;"><svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Z"/></svg></div><h2 class="mb-1.5 text-base font-bold" style="color:#2C1A0E;">No research works found</h2><p class="mx-auto mb-5 max-w-xs text-sm" style="color:#9A7A5A;">{#if searchTerm}No results for <strong>"{searchTerm}"</strong>.{:else}Try adjusting your filters.{/if}</p><button on:click={clearFilters} class="rounded-lg px-4 py-2 text-sm font-bold" style="background:#0D5C29;color:#F5F0E8;">Browse all</button></div>
	{:else if viewType === 'grid'}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each theses as thesis (thesis.id)}
			<ItemCard
            title={thesis.title}
            author={thesis.author}
            year={thesis.publicationYear}
            subtitle={thesis.department || thesis.category || 'Research work'}
            coverLabel="Research"
            pdfAvailable={thesis.pdfAvailable}
            availableCopies={thesis.availableCopies}
            totalCopies={thesis.totalCopies}
            isReserved={reservedIds.includes(thesis.id)}
            isBorrowed={borrowedIds.includes(thesis.id)}
            requesting={requestingId === thesis.id}
            cancelling={cancellingId === thesis.id}
            busy={requestingId !== null}
            requestLabel="Request copy"
            onSelect={() => { selectedThesis = thesis; }}
            onRequest={() => { void submitRequest(thesis); }}
            onCancel={() => { void cancelRequest(thesis); }}
          />
			{/each}
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl border shadow-sm" style="border-color:#D4C4A8;"><div class="overflow-x-auto"><table class="w-full min-w-[700px] border-collapse"><thead><tr style="background:#EDE4D4;border-bottom:1.5px solid #D4C4A8;"><th class="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Research work</th><th class="hidden px-3 py-3.5 text-left text-xs font-bold uppercase tracking-widest sm:table-cell sm:px-5" style="color:#7A5A2A;">Author / Department</th><th class="hidden px-3 py-3.5 text-left text-xs font-bold uppercase tracking-widest md:table-cell md:px-5" style="color:#7A5A2A;">Copies</th><th class="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Status</th><th class="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Action</th></tr></thead><tbody>{#each theses as thesis (thesis.id)}{@const isReserved = reservedIds.includes(thesis.id)}{@const isBorrowed = borrowedIds.includes(thesis.id)}<tr style="border-bottom:1px solid #EDE4D4;background:{isReserved ? '#FDF8EC' : isBorrowed ? '#F5FBEE' : '#FDF8F0'};"><td class="px-3 py-3.5 sm:px-5"><div class="flex items-center gap-3"><div class="flex h-12 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg" style="background:linear-gradient(135deg,#0D5C29,#1a7a3a);"><svg class="h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Z"/></svg></div><div class="min-w-0"><button on:click={() => selectedThesis = thesis} class="line-clamp-1 text-left text-sm font-bold" style="color:#1A3A1A;">{thesis.title}</button><p class="text-xs font-semibold" style="color:#B06A00;">#{thesis.thesisId}</p><p class="truncate text-xs italic sm:hidden" style="color:#9A7A5A;">{thesis.author}{#if thesis.department} · {thesis.department}{/if}</p></div></div></td><td class="hidden px-3 py-3.5 text-sm sm:table-cell sm:px-5"><p class="italic" style="color:#7A5A2A;">{thesis.author}</p><p class="text-xs" style="color:#9A7A5A;">{thesis.department || '—'}{#if thesis.publicationYear} · {thesis.publicationYear}{/if}</p></td><td class="hidden px-3 py-3.5 md:table-cell md:px-5"><div class="flex items-center gap-2"><div class="h-1.5 w-16 overflow-hidden rounded-full" style="background:#E8DED0;"><div class="h-full rounded-full" style="{getFillBarStyle(thesis)}width:{thesis.totalCopies > 0 ? Math.round(thesis.availableCopies / thesis.totalCopies * 100) : 0}%;"></div></div><span class="text-xs font-semibold tabular-nums" style="color:#7A5A2A;">{thesis.availableCopies}/{thesis.totalCopies}</span></div></td><td class="px-3 py-3.5 sm:px-5"><span class="inline-flex rounded-md px-2 py-1 text-[10px] font-bold" style={getStatusStyle(thesis.status || 'Unavailable', isReserved, isBorrowed)}>{isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : thesis.status}</span></td><td class="px-3 py-3.5 sm:px-5"><div class="flex items-center justify-center gap-2">{#if isBorrowed}<span class="rounded-lg border px-3 py-1.5 text-xs font-bold" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;">Borrowed</span>{:else if isReserved}<button on:click={() => cancelRequest(thesis)} disabled={cancellingId === thesis.id} class="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style="background:#F5EAEA;border-color:#D4A8A8;color:#A83232;">{cancellingId === thesis.id ? '...' : 'Cancel'}</button>{:else}<button on:click={() => submitRequest(thesis)} disabled={requestingId !== null || thesis.availableCopies === 0} class="rounded-lg px-3.5 py-1.5 text-xs font-bold disabled:cursor-not-allowed" style={thesis.availableCopies === 0 ? 'background:#E8DED0;color:#9A8A7A;' : 'background:#0D5C29;color:#F5F0E8;'}>{requestingId === thesis.id ? '...' : 'Request'}</button><button on:click={() => selectedThesis = thesis} type="button" aria-label="View research details" class="flex h-8 w-8 items-center justify-center rounded-lg border" style="background:#FDF8F0;border-color:#D4C4A8;color:#9A7A5A;"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" d="M2.5 12C3.7 8 7.5 5 12 5s8.3 3 9.5 7c-1.2 4-5 7-9.5 7s-8.3-3-9.5-7Z"/></svg></button>{/if}</div></td></tr>{/each}</tbody></table></div></div>
	{/if}

	{#if totalPages > 1 && !loading}
		<nav class="flex flex-wrap items-center justify-center gap-1 pt-1" aria-label="Research pages"><button on:click={() => loadResearch(currentPage - 1)} disabled={currentPage <= 1} class="h-9 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40" style="background:#F5F0E8;border-color:#D4C4A8;color:#3A2A1A;">Prev</button>{#each pageNumbers as page}{#if page === -1}<span class="flex h-9 w-9 items-center justify-center" style="color:#C4B8A8;">·</span>{:else}<button on:click={() => loadResearch(page)} disabled={page === currentPage} class="h-9 w-9 rounded-lg border text-sm font-semibold" style={page === currentPage ? 'background:#0D5C29;color:#F5F0E8;border-color:#0D5C29;' : 'background:#F5F0E8;border-color:#D4C4A8;color:#3A2A1A;'}>{page}</button>{/if}{/each}<button on:click={() => loadResearch(currentPage + 1)} disabled={currentPage >= totalPages} class="h-9 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40" style="background:#F5F0E8;border-color:#D4C4A8;color:#3A2A1A;">Next</button></nav>
	{/if}
</div>

<ResearchModal
	research={selectedThesis}
	reservedResearchIds={reservedIds}
	borrowedResearchIds={borrowedIds}
	actionLoading={requestingId === selectedThesis?.id || cancellingId === selectedThesis?.id}
	onClose={() => selectedThesis = null}
	onReserve={submitRequest}
	onCancelReserve={cancelRequest}
/>

<style>
	:global(tbody td:first-child button.line-clamp-1) {
		display: -webkit-box;
		min-height: 2.5rem;
		line-height: 1.25rem;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
</style>
