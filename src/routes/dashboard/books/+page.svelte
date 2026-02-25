<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import BookModal from '$lib/components/ui/BookModal.svelte';

  export let data;
  const currentUser = data.user;

  interface Book {
    id: number;
    bookId: string;
    title: string;
    author: string;
    isbn?: string;
    publisher?: string;
    publishedYear: number;
    edition?: string;
    language?: string;
    pages?: number;
    categoryId?: number;
    category?: string;
    location?: string;
    totalCopies: number;
    availableCopies: number;
    description?: string;
    coverImage?: string;
    status?: string;
  }

  let books: Book[] = [];
  let searchTerm = "";
  let selectedCategory = "all";
  let loading = false;
  let error = "";
  let selectedBook: Book | null = null;
  let actionLoading = false;
  let cancellingBookId: number | null = null;
  let reservedBookIds: number[] = [];
  let borrowedBookIds: number[] = [];

  $: books.forEach(book => {
    book.status = book.availableCopies > 5 ? 'Available' :
                  book.availableCopies > 0 ? 'Limited' : 'Unavailable';
  });

  function getCoverUrl(book: any) {
    let coverImage = book?.coverImage;
    if (!coverImage) return null;
    if (coverImage.includes('/api/images/cover/')) coverImage = coverImage.split('/api/images/cover/')[1];
    return `/api/images/cover/${encodeURIComponent(coverImage)}`;
  }

  function getAuthToken(): string | null {
    if (!browser) return null;
    for (let cookie of document.cookie.split(';')) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'client_token') return value;
    }
    return null;
  }

  async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
    const token = getAuthToken();
    const options: RequestInit = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    if (token) (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(endpoint, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Request failed');
    return result;
  }

  async function fetchUserBookStatus() {
    try {
      const res = await apiCall(`/api/books/transaction?userId=${currentUser.id}`);
      reservedBookIds = res.reservedBookIds || [];
      borrowedBookIds = res.borrowedBookIds || [];
      // If an item appears as both reserved and borrowed (or overdue), treat it as borrowed
      if (Array.isArray(reservedBookIds) && Array.isArray(borrowedBookIds) && borrowedBookIds.length > 0) {
        reservedBookIds = reservedBookIds.filter(id => !borrowedBookIds.includes(id));
      }
    } catch { reservedBookIds = []; borrowedBookIds = []; }
  }

  let currentPage = 1;
  let totalPages = 1;
  let totalBooks = 0;
  const PAGE_SIZE = 12;

  async function fetchBooks(page = 1) {
    if (!browser) return;
    loading = true; error = ""; currentPage = page;
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('search', searchTerm || '');
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      const result = await apiCall(`/api/books?${params.toString()}`);
      books = result.data.books;
      totalPages = result.data.pagination.totalPages || 1;
      totalBooks = result.data.pagination.totalBooks || 0;
      await fetchUserBookStatus();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch books';
      books = [];
    } finally { loading = false; }
  }

  async function handleBookAction(book: Book) {
    if (actionLoading) return;
    if (reservedBookIds.includes(book.id) || borrowedBookIds.includes(book.id)) return;
    if (!confirm(`Reserve "${book.title}"?`)) return;
    actionLoading = true; error = "";
    try {
      const today = new Date();
      const requestedBorrowDate = today.toISOString().split('T')[0];
      const due = new Date(today); due.setDate(due.getDate() + 14);
      await apiCall('/api/books/transaction', 'POST', {
        itemId: Number(book.id), itemType: 'book', userId: Number(currentUser.id),
        requestType: 'reserve', requestedBorrowDate, requestedDueDate: due.toISOString().split('T')[0]
      });
      selectedBook = null;
      await fetchBooks(currentPage);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to reserve book';
    } finally { actionLoading = false; }
  }

  async function handleCancelReserve(book: Book) {
    if (cancellingBookId) return;
    if (!confirm(`Cancel reservation for "${book.title}"?`)) return;
    cancellingBookId = book.id; error = "";
    try {
      // Use the dedicated cancel endpoint which expects a POST with itemId/userId
      await apiCall('/api/books/transaction/cancel_reserve', 'POST', {
        itemId: Number(book.id), itemType: 'book', userId: Number(currentUser.id)
      });
      await fetchBooks(currentPage);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to cancel reservation';
    } finally { cancellingBookId = null; }
  }

  let searchInputValue = "";
  function performSearch() { searchTerm = searchInputValue; currentPage = 1; fetchBooks(1); }
  function clearSearch() { searchInputValue = ''; searchTerm = ''; currentPage = 1; fetchBooks(1); }
  function openBookModal(book: Book) { selectedBook = book; }

  let viewType: 'grid' | 'table' = 'grid';
  let categories: { id: number; name: string }[] = [];
  let categoriesLoaded = false;
  let showCategoryDropdown = false;
  let categoryDropdownRef: HTMLDivElement | null = null;
  let categoryTriggerRef: HTMLButtonElement | null = null;

  async function fetchCategories() {
    try {
      const res = await fetch('/api/books/categories', { credentials: 'include' });
      const result = await res.json();
      categories = result.success && Array.isArray(result.data.categories) ? result.data.categories : [];
      categoriesLoaded = true;
    } catch { categories = []; categoriesLoaded = true; }
  }

  function handleOutsideClick(e: MouseEvent) {
    const t = e.target as Node;
    if (categoryDropdownRef && !categoryDropdownRef.contains(t) && categoryTriggerRef && !categoryTriggerRef.contains(t))
      showCategoryDropdown = false;
  }

  onMount(() => {
    fetchCategories(); fetchBooks();
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  });

  function selectCategory(catId: string) { selectedCategory = catId; showCategoryDropdown = false; currentPage = 1; fetchBooks(1); }

  function getPageNumbers(current: number, total: number): number[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
    if (current >= total - 3) return [1, -1, total-4, total-3, total-2, total-1, total];
    return [1, -1, current-1, current, current+1, -1, total];
  }

  $: pageNumbers = getPageNumbers(currentPage, totalPages);
  $: selectedCategoryName = selectedCategory === 'all'
    ? 'All Categories'
    : categories.find(c => String(c.id) === String(selectedCategory))?.name || 'All Categories';

  function getStatusColor(status: string | undefined, isReserved: boolean, isBorrowed: boolean) {
    if (isBorrowed)  return 'bg-emerald-500';
    if (isReserved)  return 'bg-amber-400';
    if (status === 'Available') return 'bg-emerald-500';
    if (status === 'Limited')   return 'bg-amber-400';
    return 'bg-slate-400';
  }

  function getFillBar(book: Book) {
    if (book.availableCopies > 5) return 'bg-emerald-500';
    if (book.availableCopies > 0) return 'bg-amber-400';
    return 'bg-slate-300';
  }
</script>

<div class="w-full space-y-2 text-slate-800">

  <!-- ── Header ── -->
  <div class="flex items-center gap-3 bg-white rounded-md border border-slate-200 shadow-sm px-2 py-2 sm:px-5 sm:py-4">
    <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-[#f0f7f2] border border-[#d9eee1] flex items-center justify-center text-[#0D5C29]">
      <svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <h1 class="text-lg sm:text-2xl font-bold text-slate-900">Library Catalog</h1>
      <p class="text-sm text-slate-500 mt-0.5 hidden sm:block">Browse and reserve books from our collection</p>
    </div>
    <div class="hidden sm:flex bg-slate-50 border border-slate-200 rounded-md p-0.5 gap-0.5 flex-shrink-0">
      <button on:click={() => viewType = 'grid'} type="button"
        class="flex items-center gap-2 px-2 py-2 sm:px-4 rounded text-sm font-semibold transition-all {viewType === 'grid' ? 'bg-[#0D5C29] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>Grid
      </button>
      <button on:click={() => viewType = 'table'} type="button"
        class="flex items-center gap-2 px-2 py-2 sm:px-4 rounded text-sm font-semibold transition-all {viewType === 'table' ? 'bg-[#0D5C29] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
        </svg>List
      </button>
    </div>
  </div>

  <!-- ── Filter Card ── -->
  <div class="bg-white rounded-md border border-slate-200 shadow-sm p-2 sm:p-4">
    <form on:submit|preventDefault={performSearch} class="flex gap-2 items-center">
      <div class="relative flex-1 min-w-0">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search title, author…" bind:value={searchInputValue} disabled={loading} autocomplete="off"
          class="w-full h-11 pl-10 pr-9 border border-slate-200 rounded text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all disabled:opacity-60"/>
        {#if searchInputValue}
          <button on:click={clearSearch} type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        {/if}
      </div>
      <button type="submit" disabled={loading}
        class="h-11 px-3 sm:px-5 bg-[#0D5C29] hover:bg-[#116b30] text-white rounded text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60 flex-shrink-0">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <span class="hidden sm:inline">Search</span>
      </button>
    </form>

    <div class="flex gap-2 mt-2">
      <!-- Category -->
      <div class="relative flex-1 min-w-0 z-40">
        <button bind:this={categoryTriggerRef} type="button" disabled={!categoriesLoaded}
          on:click={() => showCategoryDropdown = !showCategoryDropdown}
          class="w-full h-11 px-2 sm:px-4 flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-medium hover:border-slate-300 hover:bg-white transition-all disabled:opacity-60">
          <svg class="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <span class="flex-1 text-left truncate text-sm">{selectedCategoryName}</span>
          <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform {showCategoryDropdown ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        {#if showCategoryDropdown}
          <div bind:this={categoryDropdownRef}
            class="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto z-50">
            {#each [{ id: 'all', name: 'All Categories' }, ...categories.map(c => ({ id: String(c.id), name: c.name }))] as opt}
              <button type="button" on:click={() => selectCategory(opt.id)}
                class="w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-sm text-left transition-colors border-b border-slate-50 last:border-0
                  {String(opt.id) === String(selectedCategory) ? 'bg-[#f0f7f2] text-[#0D5C29] font-semibold' : 'text-slate-700 hover:bg-slate-50'}">
                {#if String(opt.id) === String(selectedCategory)}
                  <svg class="w-3.5 h-3.5 text-[#0D5C29] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                {:else}<span class="w-3.5 flex-shrink-0"></span>{/if}
                {opt.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Mobile view toggle -->
      <div class="flex bg-slate-50 border border-slate-200 rounded p-0.5 gap-0.5 flex-shrink-0 sm:hidden">
        <button on:click={() => viewType = 'grid'} type="button"
          class="px-3 py-2 rounded transition-all {viewType === 'grid' ? 'bg-[#0D5C29] text-white' : 'text-slate-400 hover:text-slate-600'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button on:click={() => viewType = 'table'} type="button"
          class="px-3 py-2 rounded transition-all {viewType === 'table' ? 'bg-[#0D5C29] text-white' : 'text-slate-400 hover:text-slate-600'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Status row -->
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 gap-2">
      <p class="text-sm text-slate-500 flex items-center gap-2 flex-wrap min-w-0">
        {#if loading}
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-[#0D5C29] rounded-full animate-bounce [animation-delay:0ms]"></span>
            <span class="w-1.5 h-1.5 bg-[#0D5C29] rounded-full animate-bounce [animation-delay:150ms]"></span>
            <span class="w-1.5 h-1.5 bg-[#0D5C29] rounded-full animate-bounce [animation-delay:300ms]"></span>
          </span>
          <span class="text-slate-400">Loading…</span>
        {:else}
          <strong class="text-slate-600 font-semibold">{totalBooks.toLocaleString()}</strong> books
          {#if searchTerm}
            <span class="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-md">
              "{searchTerm}" <button on:click={clearSearch} type="button"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </span>
          {/if}
          {#if selectedCategory !== 'all'}
            <span class="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-md">
              {selectedCategoryName} <button on:click={() => selectCategory('all')} type="button"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </span>
          {/if}
        {/if}
      </p>
      {#if !loading && (searchTerm || selectedCategory !== 'all')}
        <button on:click={clearSearch} type="button" class="text-xs text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2 flex-shrink-0">Clear all</button>
      {/if}
    </div>
  </div>

  <!-- ── Error ── -->
  {#if error}
    <div class="flex items-center gap-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700" role="alert">
      <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span class="flex-1 text-sm">{error}</span>
      <button on:click={() => error = ""} class="text-red-400 hover:text-red-600"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>
  {/if}

  <!-- ── Skeleton ── -->
  {#if loading}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {#each Array(PAGE_SIZE) as _}
        <div class="bg-white rounded border border-slate-100 overflow-hidden">
          <div class="h-44 bg-slate-100 animate-pulse"></div>
          <div class="p-2 space-y-2">
            <div class="h-3 rounded bg-slate-100 animate-pulse w-4/5"></div>
            <div class="h-3 rounded bg-slate-100 animate-pulse w-3/5"></div>
            <div class="h-8 rounded bg-slate-100 animate-pulse mt-2"></div>
          </div>
        </div>
      {/each}
    </div>

  {:else if books.length === 0}
    <div class="bg-white rounded border border-slate-200 text-center py-12 px-3">
      <div class="w-14 h-14 mx-auto mb-3 rounded-md bg-[#f0f7f2] border border-[#d9eee1] flex items-center justify-center text-[#0D5C29]">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-800 mb-1.5">No books found</h3>
      <p class="text-sm text-slate-400 max-w-xs mx-auto mb-5">{#if searchTerm}No results for <strong>"{searchTerm}"</strong>.{:else}Try adjusting your filters.{/if}</p>
      <button on:click={clearSearch} type="button" class="px-3 py-2 bg-[#0D5C29] hover:bg-[#116b30] text-white rounded-lg text-sm font-bold transition-colors">Browse all</button>
    </div>

  {:else}

    <!-- ═══ GRID VIEW ═══ -->
    {#if viewType === 'grid'}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
        {#each books as book (book.id)}
          {@const isReserved = reservedBookIds.includes(book.id)}
          {@const isBorrowed = borrowedBookIds.includes(book.id)}
          {@const isCancelling = cancellingBookId === book.id}
          {@const unavailable = book.availableCopies === 0 && !isReserved && !isBorrowed}

          <article
            on:click={() => openBookModal(book)}
            on:keydown={(e) => e.key === 'Enter' && openBookModal(book)}
            tabindex="0" role="button" aria-label="View {book.title}"
            class="group relative bg-white overflow-hidden cursor-pointer flex flex-col outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#0D5C29] focus-visible:ring-offset-1
              {isReserved
                ? 'rounded border-2 border-amber-300'
                : isBorrowed
                ? 'rounded border-2 border-emerald-300'
                : 'rounded border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'}"
          >
            <!-- Cover -->
            <div class="relative w-full h-40 sm:h-48 overflow-hidden bg-slate-200 flex-shrink-0">
              {#if getCoverUrl(book)}
                <img
                  src={getCoverUrl(book)}
                  alt={book.title}
                  loading="lazy"
                  class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300"
                  on:load={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    const cw = img.parentElement!.clientWidth;
                    const ch = img.parentElement!.clientHeight;
                    const containerRatio = cw / ch;
                    const imgRatio = img.naturalWidth / img.naturalHeight;
                    const scale = imgRatio < containerRatio
                      ? Math.min((containerRatio / imgRatio) * 1.02, 1.6)
                      : 1.02;
                    img.style.transform = `scale(${scale.toFixed(3)})`;
                    img.addEventListener('mouseenter', () => { img.style.transform = `scale(${(scale * 1.06).toFixed(3)})`; });
                    img.addEventListener('mouseleave', () => { img.style.transform = `scale(${scale.toFixed(3)})`; });
                  }}
                />
              {:else}
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
                  style="background:linear-gradient(150deg,#0D5C29,#1a7a3a)">
                  <div class="absolute left-0 inset-y-0 w-1.5 bg-amber-400 opacity-80"></div>
                  <svg class="w-8 h-8 text-white/25" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2z"/></svg>
                  <p class="text-[10px] font-bold text-white/60 text-center uppercase tracking-wider leading-tight line-clamp-3">{book.title}</p>
                </div>
              {/if}

              <!-- Status badge -->
              <span class="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded text-white
                {getStatusColor(book.status, isReserved, isBorrowed)}">
                {isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : book.status}
              </span>
            </div>

            <!-- Body -->
            <div class="px-1 pt-2 pb-2 flex flex-col gap-1 flex-1">
              <h3 class="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{book.title}</h3>
              <p class="text-[11px] text-slate-400 truncate leading-none">{book.author}</p>

              <!-- Availability bar -->
              <div class="flex items-center gap-1.5 mt-0.5">
                <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full {getFillBar(book)}" style="width:{book.totalCopies>0?Math.round((book.availableCopies/book.totalCopies)*100):0}%"></div>
                </div>
                <span class="text-[10px] font-semibold text-slate-400 tabular-nums">{book.availableCopies}/{book.totalCopies}</span>
              </div>

              <!-- Actions -->
              <div class="flex gap-1 mt-0.5">
                {#if isBorrowed}
                  <div class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Borrowed
                  </div>
                {:else if isReserved}
                  <div class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold min-w-0">
                    <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="truncate">Reserved</span>
                  </div>
                  <button
                    on:click|stopPropagation={() => handleCancelReserve(book)}
                    disabled={isCancelling} type="button" title="Cancel"
                    class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-50"
                  >
                    {#if isCancelling}
                      <span class="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin"></span>
                    {:else}
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    {/if}
                  </button>
                {:else}
                  <button
                    on:click|stopPropagation={() => handleBookAction(book)}
                    disabled={actionLoading || unavailable} type="button"
                    class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded text-xs font-bold transition-all active:scale-95
                      {unavailable ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#0D5C29] hover:bg-[#116b30] text-white'}"
                  >
                    {#if actionLoading}
                      <span class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>
                    {:else if unavailable}
                      Unavailable
                    {:else}
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Reserve
                    {/if}
                  </button>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>

    {:else}
      <!-- ═══ TABLE VIEW ═══ -->
      <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse min-w-[540px]">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-3 sm:px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Book</th>
                <th class="px-3 sm:px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Author</th>
                <th class="px-3 sm:px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell">Copies</th>
                <th class="px-3 sm:px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th class="px-3 sm:px-5 py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each books as book (book.id)}
                {@const isReserved = reservedBookIds.includes(book.id)}
                {@const isBorrowed = borrowedBookIds.includes(book.id)}
                {@const isCancelling = cancellingBookId === book.id}
                <tr class="hover:bg-slate-50/60 transition-colors {isReserved ? 'bg-amber-50/40' : isBorrowed ? 'bg-emerald-50/30' : ''}">
                  <td class="px-3 sm:px-5 py-4 align-middle">
                    <div class="flex items-center gap-3">
                      <div class="flex-shrink-0 w-9 h-13 rounded-md overflow-hidden bg-slate-100">
                        {#if getCoverUrl(book)}
                          <img src={getCoverUrl(book)} alt="" class="w-full h-full object-cover"/>
                        {:else}
                          <div class="w-full h-full flex items-center justify-center" style="background:linear-gradient(135deg,#0D5C29,#1a7a3a)">
                            <svg class="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2z"/></svg>
                          </div>
                        {/if}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 line-clamp-1">{book.title}</p>
                        <p class="text-xs text-amber-500 font-semibold">#{book.bookId}</p>
                        <p class="text-xs text-slate-400 italic sm:hidden truncate">{book.author}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 sm:px-5 py-4 align-middle text-sm text-slate-500 italic hidden sm:table-cell">{book.author}</td>
                  <td class="px-3 sm:px-5 py-4 align-middle hidden md:table-cell">
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full {getFillBar(book)}" style="width:{book.totalCopies>0?Math.round((book.availableCopies/book.totalCopies)*100):0}%"></div>
                      </div>
                      <span class="text-xs font-semibold text-slate-500 tabular-nums">{book.availableCopies}/{book.totalCopies}</span>
                    </div>
                  </td>
                  <td class="px-3 sm:px-5 py-4 align-middle">
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded text-white {getStatusColor(book.status, isReserved, isBorrowed)}">
                      {isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : book.status}
                    </span>
                  </td>
                  <td class="px-3 sm:px-5 py-4 align-middle">
                    <div class="flex items-center justify-center gap-2">
                      {#if isBorrowed}
                        <span class="px-3 py-1.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Borrowed
                        </span>
                      {:else if isReserved}
                        <span class="px-3 py-1.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Reserved
                        </span>
                        <button on:click={() => handleCancelReserve(book)} disabled={isCancelling} type="button" title="Cancel"
                          class="w-8 h-8 flex items-center justify-center rounded bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-50">
                          {#if isCancelling}<span class="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin"></span>
                          {:else}<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>{/if}
                        </button>
                      {:else}
                        <button on:click={() => handleBookAction(book)} disabled={actionLoading || book.availableCopies === 0} type="button"
                          class="px-3.5 py-1.5 rounded text-xs font-bold transition-all
                            {book.availableCopies === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#0D5C29] hover:bg-[#116b30] text-white'}">
                          {actionLoading ? '…' : 'Reserve'}
                        </button>
                        <button on:click={() => openBookModal(book)} type="button" aria-label="View"
                          class="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400 hover:bg-[#0D5C29] hover:text-white hover:border-[#0D5C29] transition-all">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- ── Pagination ── -->
    {#if totalPages > 1}
      <div class="flex items-center justify-center gap-1 flex-wrap pt-1">
        <button on:click={() => fetchBooks(currentPage - 1)} disabled={currentPage <= 1} type="button"
          class="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-sm">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>Prev
        </button>
        {#each pageNumbers as page}
          {#if page === -1}
            <span class="w-9 h-9 flex items-center justify-center text-slate-300 text-base">·</span>
          {:else}
            <button on:click={() => fetchBooks(page)} disabled={page === currentPage} type="button"
              class="w-9 h-9 rounded border text-sm font-semibold transition-all shadow-sm
                {page === currentPage ? 'bg-[#0D5C29] text-white border-[#0D5C29] cursor-default' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}">
              {page}
            </button>
          {/if}
        {/each}
        <button on:click={() => fetchBooks(currentPage + 1)} disabled={currentPage >= totalPages} type="button"
          class="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-sm">
          Next<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    {/if}
  {/if}
</div>

{#if selectedBook}
  <BookModal book={selectedBook} {reservedBookIds} {borrowedBookIds} {actionLoading}
    onClose={() => selectedBook = null} onReserve={handleBookAction} onCancelReserve={handleCancelReserve}/>
{/if}