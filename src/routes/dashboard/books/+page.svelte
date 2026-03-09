<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import BookModal from '$lib/components/ui/BookModal.svelte';

  interface PageData {
    user: {
      id: number;
      name: string;
      username: string;
      email: string | null;
      userType: string;
    };
    initialSearch?: string;
    initialCategory?: string;
    initialPage?: number;
  }

  export let data: PageData;
  const { user: currentUser, initialSearch = '', initialCategory = 'all', initialPage = 1 } = data;

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
  let searchInputValue = "";
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
      if (Array.isArray(reservedBookIds) && Array.isArray(borrowedBookIds) && borrowedBookIds.length > 0) {
        reservedBookIds = reservedBookIds.filter(id => !borrowedBookIds.includes(id));
      }
    } catch { reservedBookIds = []; borrowedBookIds = []; }
  }

  let currentPage = initialPage;
  let totalPages = 1;
  let totalBooks = 0;
  const PAGE_SIZE = 12;

  async function fetchBooks(page = 1) {
    if (!browser) return;
    loading = true; error = "";
    currentPage = page;
    updateUrl();
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
      await apiCall('/api/books/transaction/cancel_reserve', 'POST', {
        itemId: Number(book.id), itemType: 'book', userId: Number(currentUser.id)
      });
      await fetchBooks(currentPage);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to cancel reservation';
    } finally { cancellingBookId = null; }
  }

  function performSearch() {
    searchTerm = searchInputValue;
    currentPage = 1;
    updateUrl();
    fetchBooks(1);
  }
  function clearSearch() {
    searchInputValue = '';
    searchTerm = '';
    currentPage = 1;
    updateUrl();
    fetchBooks(1);
  }
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

  function updateUrl() {
    if (!browser) return;
    const u = new URL(window.location.href);
    if (searchTerm) u.searchParams.set('q', searchTerm);
    else u.searchParams.delete('q');
    if (selectedCategory && selectedCategory !== 'all') u.searchParams.set('category', selectedCategory);
    else u.searchParams.delete('category');
    if (currentPage && currentPage > 1) u.searchParams.set('page', String(currentPage));
    else u.searchParams.delete('page');
    history.replaceState(null, '', u.toString());
  }

  onMount(() => {
    if (initialSearch) { searchTerm = initialSearch; searchInputValue = initialSearch; }
    if (initialCategory && initialCategory !== 'all') selectedCategory = initialCategory;
    fetchCategories();
    fetchBooks(currentPage);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  });

  function selectCategory(catId: string) {
    selectedCategory = catId;
    showCategoryDropdown = false;
    currentPage = 1;
    updateUrl();
    fetchBooks(1);
  }

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

  // Status color helpers — warm earthy tones
  function getStatusBadgeStyle(status: string | undefined, isReserved: boolean, isBorrowed: boolean): string {
    if (isBorrowed)              return 'background:#0D5C29; color:#fff;';
    if (isReserved)              return 'background:#B06A00; color:#fff;';
    if (status === 'Available')  return 'background:#0D5C29; color:#fff;';
    if (status === 'Limited')    return 'background:#B06A00; color:#fff;';
    return 'background:#7A6A5A; color:#fff;';
  }

  function getFillBarStyle(book: Book): string {
    if (book.availableCopies > 5) return 'background:#0D5C29;';
    if (book.availableCopies > 0) return 'background:#B06A00;';
    return 'background:#C4B8A8;';
  }
</script>

<!-- Warm parchment page wrapper -->
<div class="w-full space-y-2 text-sm" style="color: #2C1A0E;">

  <!-- ── Header ── -->
  <div class="relative overflow-hidden rounded-xl shadow-sm px-3 py-3 sm:px-5 sm:py-3.5 border"
    style="background: linear-gradient(135deg, #3A6B3A 0%, #0D5C29 50%, #1A4D1A 100%); border-color: #1A4D1A;">
    <div class="absolute inset-0 opacity-10 pointer-events-none"
      style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 11px);"></div>
    <div class="relative z-10 flex items-center gap-3">
      <div class="flex-shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center"
        style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3);">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg sm:text-xl font-bold leading-tight" style="color: #F5F0E8;">Book Catalog</h1>
        <p class="text-xs sm:text-sm mt-0.5 hidden sm:block" style="color: rgba(245,240,232,0.7);">Browse and reserve books from our collection</p>
      </div>
      <!-- Desktop view toggle -->
      <div class="hidden sm:flex rounded-lg p-0.5 gap-0.5 flex-shrink-0 border"
        style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.15);">
        <button on:click={() => viewType = 'grid'} type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all"
          style="{viewType === 'grid' ? 'background: #F5F0E8; color: #0D5C29;' : 'color: rgba(245,240,232,0.6);'}">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>Grid
        </button>
        <button on:click={() => viewType = 'table'} type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all"
          style="{viewType === 'table' ? 'background: #F5F0E8; color: #0D5C29;' : 'color: rgba(245,240,232,0.6);'}">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>List
        </button>
      </div>
    </div>
  </div>

  <!-- ── Filter Card ── -->
  <div class="rounded-xl shadow-sm p-2 sm:p-4 border" style="background: #F5F0E8; border-color: #D4C4A8;">
    <form on:submit|preventDefault={performSearch} class="flex gap-2 items-center">
      <div class="relative flex-1 min-w-0">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #9A7A5A;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search title, author…" bind:value={searchInputValue} disabled={loading} autocomplete="off"
          class="w-full h-11 pl-10 pr-9 rounded-lg text-sm transition-all disabled:opacity-60 focus:outline-none"
          style="background: #FDF8F0; border: 1.5px solid #D4C4A8; color: #2C1A0E; placeholder-color: #9A7A5A;"
          on:focus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#0D5C29'}
          on:blur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#D4C4A8'}
        />
        {#if searchInputValue}
          <button on:click={clearSearch} type="button" aria-label="Clear search"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
            style="background: #D4C4A8; color: #7A5A2A;">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        {/if}
      </div>
      <button type="submit" disabled={loading}
        class="h-11 px-3 sm:px-5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60 flex-shrink-0"
        style="background: #0D5C29; color: #F5F0E8;">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <span class="hidden sm:inline">Search</span>
      </button>
    </form>

    <div class="flex gap-2 mt-2">
      <!-- Category dropdown -->
      <div class="relative flex-1 min-w-0 z-40">
        <button bind:this={categoryTriggerRef} type="button" disabled={!categoriesLoaded}
          on:click={() => showCategoryDropdown = !showCategoryDropdown}
          class="w-full h-11 px-2 sm:px-4 flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60 border"
          style="background: #FDF8F0; border-color: #D4C4A8; color: #3A2A1A;">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #9A7A5A;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <span class="flex-1 text-left truncate text-sm">{selectedCategoryName}</span>
          <svg class="w-3.5 h-3.5 flex-shrink-0 transition-transform {showCategoryDropdown ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #9A7A5A;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        {#if showCategoryDropdown}
          <div bind:this={categoryDropdownRef}
            class="absolute top-[calc(100%+4px)] left-0 right-0 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto z-50 border"
            style="background: #FDF8F0; border-color: #D4C4A8;">
            {#each [{ id: 'all', name: 'All Categories' }, ...categories.map(c => ({ id: String(c.id), name: c.name }))] as opt}
              <button type="button" on:click={() => selectCategory(opt.id)}
                class="w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-sm text-left transition-colors border-b last:border-0"
                style="{String(opt.id) === String(selectedCategory)
                  ? 'background: #EFF5EF; color: #0D5C29; font-weight: 600; border-color: #D4C4A8;'
                  : 'color: #3A2A1A; border-color: #EDE4D4;'}">
                {#if String(opt.id) === String(selectedCategory)}
                  <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color: #0D5C29;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                {:else}<span class="w-3.5 flex-shrink-0"></span>{/if}
                {opt.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Mobile view toggle -->
      <div class="flex rounded-lg p-0.5 gap-0.5 flex-shrink-0 sm:hidden border"
        style="background: #FDF8F0; border-color: #D4C4A8;">
        <button on:click={() => viewType = 'grid'} type="button" aria-label="Grid view"
          class="px-3 py-2 rounded-md transition-all"
          style="{viewType === 'grid' ? 'background: #0D5C29; color: #fff;' : 'color: #9A7A5A;'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button on:click={() => viewType = 'table'} type="button" aria-label="List view"
          class="px-3 py-2 rounded-md transition-all"
          style="{viewType === 'table' ? 'background: #0D5C29; color: #fff;' : 'color: #9A7A5A;'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Status row -->
    <div class="flex items-center justify-between mt-2 pt-2 gap-2" style="border-top: 1px solid #D4C4A8;">
      <p class="text-sm flex items-center gap-2 flex-wrap min-w-0" style="color: #7A5A2A;">
        {#if loading}
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style="background: #0D5C29;"></span>
            <span class="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style="background: #0D5C29;"></span>
            <span class="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style="background: #0D5C29;"></span>
          </span>
          <span style="color: #9A7A5A;">Loading…</span>
        {:else}
          <strong style="color: #2C1A0E;">{totalBooks.toLocaleString()}</strong> books
          {#if searchTerm}
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border"
              style="background: #EFF5EF; border-color: #B8D4B8; color: #0D5C29;">
              "{searchTerm}"
              <button on:click={clearSearch} type="button" aria-label="Clear search term">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </span>
          {/if}
          {#if selectedCategory !== 'all'}
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border"
              style="background: #EFF5EF; border-color: #B8D4B8; color: #0D5C29;">
              {selectedCategoryName}
              <button on:click={() => selectCategory('all')} type="button" aria-label="Clear category filter">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </span>
          {/if}
        {/if}
      </p>
      {#if !loading && (searchTerm || selectedCategory !== 'all')}
        <button on:click={clearSearch} type="button" class="text-xs font-medium underline underline-offset-2 flex-shrink-0" style="color: #9A7A5A;">Clear all</button>
      {/if}
    </div>
  </div>

  <!-- ── Error ── -->
  {#if error}
    <div class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border" style="background: #F5E6E6; border-color: #D4A0A0; color: #7A1A1A;" role="alert">
      <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span class="flex-1 text-sm">{error}</span>
      <button on:click={() => error = ""} aria-label="Close">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  {/if}

  <!-- ── Skeleton ── -->
  {#if loading}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {#each Array(PAGE_SIZE) as _}
        <div class="rounded-xl border overflow-hidden" style="background: #F5F0E8; border-color: #D4C4A8;">
          <div class="h-44 animate-pulse" style="background: #E8DED0;"></div>
          <div class="p-2 space-y-2">
            <div class="h-3 rounded animate-pulse w-4/5" style="background: #E8DED0;"></div>
            <div class="h-3 rounded animate-pulse w-3/5" style="background: #E8DED0;"></div>
            <div class="h-8 rounded animate-pulse mt-2" style="background: #E8DED0;"></div>
          </div>
        </div>
      {/each}
    </div>

  {:else if books.length === 0}
    <div class="rounded-xl border text-center py-12 px-3" style="background: #F5F0E8; border-color: #D4C4A8;">
      <div class="w-14 h-14 mx-auto mb-3 rounded-lg border-2 flex items-center justify-center"
        style="background: #EFF5EF; border-color: #B8D4B8; color: #0D5C29;">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </div>
      <h3 class="text-base font-bold mb-1.5" style="color: #2C1A0E;">No books found</h3>
      <p class="text-sm max-w-xs mx-auto mb-5" style="color: #9A7A5A;">{#if searchTerm}No results for <strong>"{searchTerm}"</strong>.{:else}Try adjusting your filters.{/if}</p>
      <button on:click={clearSearch} type="button" class="px-4 py-2 rounded-lg text-sm font-bold transition-colors" style="background: #0D5C29; color: #F5F0E8;">Browse all</button>
    </div>

  {:else}

    <!-- ═══ GRID VIEW ═══ -->
    {#if viewType === 'grid'}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {#each books as book (book.id)}
          {@const isReserved = reservedBookIds.includes(book.id)}
          {@const isBorrowed = borrowedBookIds.includes(book.id)}
          {@const isCancelling = cancellingBookId === book.id}
          {@const unavailable = book.availableCopies === 0 && !isReserved && !isBorrowed}

          <div
            on:click={() => openBookModal(book)}
            on:keydown={(e) => e.key === 'Enter' && openBookModal(book)}
            tabindex="0" role="button" aria-label="View {book.title}"
            class="group relative overflow-hidden cursor-pointer flex flex-col outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 rounded-xl"
            style="focus-visible:ring-color: #0D5C29;
              background: #FDF8F0;
              border: {isReserved ? '2px solid #B06A00' : isBorrowed ? '2px solid #0D5C29' : '1.5px solid #D4C4A8'};
              box-shadow: 0 1px 3px rgba(44,26,14,0.08);"
            on:mouseenter={(e) => { if (!isReserved && !isBorrowed) { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(44,26,14,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; } }}
            on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(44,26,14,0.08)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            <!-- Cover -->
            <div class="relative w-full h-40 sm:h-48 overflow-hidden flex-shrink-0" style="background: #E8DED0;">
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
                    const scale = imgRatio < containerRatio ? Math.min((containerRatio / imgRatio) * 1.02, 1.6) : 1.02;
                    img.style.transform = `scale(${scale.toFixed(3)})`;
                    img.addEventListener('mouseenter', () => { img.style.transform = `scale(${(scale * 1.06).toFixed(3)})`; });
                    img.addEventListener('mouseleave', () => { img.style.transform = `scale(${scale.toFixed(3)})`; });
                  }}
                />
              {:else}
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
                  style="background: linear-gradient(150deg, #0D5C29, #1a7a3a);">
                  <div class="absolute left-0 inset-y-0 w-1.5" style="background: #E8B923; opacity: 0.8;"></div>
                  <svg class="w-8 h-8 text-white/25" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2z"/></svg>
                  <p class="text-[10px] font-bold text-white/60 text-center uppercase tracking-wider leading-tight line-clamp-3">{book.title}</p>
                </div>
              {/if}

              <!-- Status badge -->
              <span class="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-md"
                style="{getStatusBadgeStyle(book.status, isReserved, isBorrowed)}">
                {isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : book.status}
              </span>
            </div>

            <!-- Body -->
            <div class="px-2 pt-2 pb-2.5 flex flex-col gap-1 flex-1">
              <h3 class="text-xs font-bold leading-tight line-clamp-2" style="color: #1A3A1A;">{book.title}</h3>
              <p class="text-[11px] truncate leading-none" style="color: #9A7A5A;">{book.author}</p>

              <!-- Availability bar -->
              <div class="flex items-center gap-1.5 mt-0.5">
                <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: #E8DED0;">
                  <div class="h-full rounded-full transition-all" style="{getFillBarStyle(book)} width:{book.totalCopies>0?Math.round((book.availableCopies/book.totalCopies)*100):0}%;"></div>
                </div>
                <span class="text-[10px] font-semibold tabular-nums" style="color: #9A7A5A;">{book.availableCopies}/{book.totalCopies}</span>
              </div>

              <!-- Actions -->
              <div class="flex gap-1 mt-0.5">
                {#if isBorrowed}
                  <div class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-xs font-bold"
                    style="background: #EFF5EF; border-color: #B8D4B8; color: #0D5C29;">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Borrowed
                  </div>
                {:else if isReserved}
                  <div class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-xs font-bold min-w-0"
                    style="background: #F5EDD8; border-color: #D4B87A; color: #B06A00;">
                    <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="truncate">Reserved</span>
                  </div>
                  <button
                    on:click|stopPropagation={() => handleCancelReserve(book)}
                    disabled={isCancelling} type="button" title="Cancel"
                    class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50"
                    style="background: #F5EAEA; border-color: #D4A8A8; color: #A83232;"
                    on:mouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EDD0D0'; }}
                    on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5EAEA'; }}
                  >
                    {#if isCancelling}
                      <span class="w-3 h-3 border rounded-full animate-spin" style="border-color: #D4A8A8; border-top-color: #A83232;"></span>
                    {:else}
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    {/if}
                  </button>
                {:else}
                  <button
                    on:click|stopPropagation={() => handleBookAction(book)}
                    disabled={actionLoading || unavailable} type="button"
                    class="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold transition-all active:scale-95"
                    style="{unavailable ? 'background: #E8DED0; color: #9A8A7A; cursor: not-allowed;' : 'background: #0D5C29; color: #F5F0E8;'}"
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
          </div>
        {/each}
      </div>

    {:else}
      <!-- ═══ TABLE VIEW ═══ -->
      <div class="rounded-xl shadow-sm overflow-hidden border" style="border-color: #D4C4A8;">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse min-w-[540px]">
            <thead>
              <tr style="background: #EDE4D4; border-bottom: 1.5px solid #D4C4A8;">
                <th class="px-3 sm:px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style="color: #7A5A2A;">Book</th>
                <th class="px-3 sm:px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #7A5A2A;">Author</th>
                <th class="px-3 sm:px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #7A5A2A;">Copies</th>
                <th class="px-3 sm:px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style="color: #7A5A2A;">Status</th>
                <th class="px-3 sm:px-5 py-3.5 text-center text-xs font-bold uppercase tracking-widest" style="color: #7A5A2A;">Action</th>
              </tr>
            </thead>
            <tbody>
              {#each books as book (book.id)}
                {@const isReserved = reservedBookIds.includes(book.id)}
                {@const isBorrowed = borrowedBookIds.includes(book.id)}
                {@const isCancelling = cancellingBookId === book.id}
                <tr class="transition-colors"
                  style="border-bottom: 1px solid #EDE4D4;
                    background: {isReserved ? '#FDF8EC' : isBorrowed ? '#F5FBEE' : '#FDF8F0'};"
                  on:mouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = isReserved ? '#FAF3DC' : isBorrowed ? '#EEF7E4' : '#F5EED8'; }}
                  on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = isReserved ? '#FDF8EC' : isBorrowed ? '#F5FBEE' : '#FDF8F0'; }}
                >
                  <td class="px-3 sm:px-5 py-3.5 align-middle">
                    <div class="flex items-center gap-3">
                      <div class="flex-shrink-0 w-9 h-12 rounded-lg overflow-hidden" style="background: #E8DED0;">
                        {#if getCoverUrl(book)}
                          <img src={getCoverUrl(book)} alt="" class="w-full h-full object-cover"/>
                        {:else}
                          <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, #0D5C29, #1a7a3a);">
                            <svg class="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2z"/></svg>
                          </div>
                        {/if}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-bold line-clamp-1" style="color: #1A3A1A;">{book.title}</p>
                        <p class="text-xs font-semibold" style="color: #B06A00;">#{book.bookId}</p>
                        <p class="text-xs italic sm:hidden truncate" style="color: #9A7A5A;">{book.author}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 sm:px-5 py-3.5 align-middle text-sm italic hidden sm:table-cell" style="color: #7A5A2A;">{book.author}</td>
                  <td class="px-3 sm:px-5 py-3.5 align-middle hidden md:table-cell">
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-1.5 rounded-full overflow-hidden" style="background: #E8DED0;">
                        <div class="h-full rounded-full" style="{getFillBarStyle(book)} width:{book.totalCopies>0?Math.round((book.availableCopies/book.totalCopies)*100):0}%;"></div>
                      </div>
                      <span class="text-xs font-semibold tabular-nums" style="color: #7A5A2A;">{book.availableCopies}/{book.totalCopies}</span>
                    </div>
                  </td>
                  <td class="px-3 sm:px-5 py-3.5 align-middle">
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                      style="{getStatusBadgeStyle(book.status, isReserved, isBorrowed)}">
                      {isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : book.status}
                    </span>
                  </td>
                  <td class="px-3 sm:px-5 py-3.5 align-middle">
                    <div class="flex items-center justify-center gap-2">
                      {#if isBorrowed}
                        <span class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
                          style="background: #EFF5EF; color: #0D5C29; border-color: #B8D4B8;">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Borrowed
                        </span>
                      {:else if isReserved}
                        <span class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
                          style="background: #F5EDD8; color: #B06A00; border-color: #D4B87A;">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Reserved
                        </span>
                        <button on:click={() => handleCancelReserve(book)} disabled={isCancelling} type="button" title="Cancel"
                          class="w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50"
                          style="background: #F5EAEA; border-color: #D4A8A8; color: #A83232;"
                          on:mouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EDD0D0'; }}
                          on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5EAEA'; }}>
                          {#if isCancelling}
                            <span class="w-3 h-3 border rounded-full animate-spin" style="border-color: #D4A8A8; border-top-color: #A83232;"></span>
                          {:else}
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          {/if}
                        </button>
                      {:else}
                        <button on:click={() => handleBookAction(book)} disabled={actionLoading || book.availableCopies === 0} type="button"
                          class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style="{book.availableCopies === 0 ? 'background: #E8DED0; color: #9A8A7A; cursor: not-allowed;' : 'background: #0D5C29; color: #F5F0E8;'}">
                          {actionLoading ? '…' : 'Reserve'}
                        </button>
                        <button on:click={() => openBookModal(book)} type="button" aria-label="View"
                          class="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                          style="background: #FDF8F0; border-color: #D4C4A8; color: #9A7A5A;"
                          on:mouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0D5C29'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#0D5C29'; }}
                          on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FDF8F0'; (e.currentTarget as HTMLElement).style.color = '#9A7A5A'; (e.currentTarget as HTMLElement).style.borderColor = '#D4C4A8'; }}>
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
          class="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg border text-sm font-semibold transition-all disabled:opacity-40 shadow-sm"
          style="background: #F5F0E8; border-color: #D4C4A8; color: #3A2A1A;"
          on:mouseenter={(e) => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.background = '#EDE4D4'; }}
          on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F0E8'; }}>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>Prev
        </button>
        {#each pageNumbers as page}
          {#if page === -1}
            <span class="w-9 h-9 flex items-center justify-center text-base" style="color: #C4B8A8;">·</span>
          {:else}
            <button on:click={() => fetchBooks(page)} disabled={page === currentPage} type="button"
              class="w-9 h-9 rounded-lg border text-sm font-semibold transition-all shadow-sm"
              style="{page === currentPage
                ? 'background: #0D5C29; color: #F5F0E8; border-color: #0D5C29; cursor: default;'
                : 'background: #F5F0E8; border-color: #D4C4A8; color: #3A2A1A;'}"
              on:mouseenter={(e) => { if (page !== currentPage) (e.currentTarget as HTMLElement).style.background = '#EDE4D4'; }}
              on:mouseleave={(e) => { if (page !== currentPage) (e.currentTarget as HTMLElement).style.background = '#F5F0E8'; }}>
              {page}
            </button>
          {/if}
        {/each}
        <button on:click={() => fetchBooks(currentPage + 1)} disabled={currentPage >= totalPages} type="button"
          class="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg border text-sm font-semibold transition-all disabled:opacity-40 shadow-sm"
          style="background: #F5F0E8; border-color: #D4C4A8; color: #3A2A1A;"
          on:mouseenter={(e) => { if (currentPage < totalPages) (e.currentTarget as HTMLElement).style.background = '#EDE4D4'; }}
          on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F0E8'; }}>
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