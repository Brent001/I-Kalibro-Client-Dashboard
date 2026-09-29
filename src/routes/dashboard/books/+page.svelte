<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import { replaceState } from '$app/navigation';
  import BookModal from '$lib/components/ui/BookModal.svelte';
  import ItemCard from '$lib/components/ui/ItemCard.svelte';
  import {
    getCatalogFillBarStyle as getFillBarStyle,
    getCatalogPageNumbers as getPageNumbers,
    getCatalogStatusStyle as getStatusBadgeStyle
  } from '$lib/utils/catalogDisplay.js';
  import {
    Book as BookIcon,
    BookOpen,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock,
    Eye,
    LayoutGrid,
    List,
    Plus,
    Search,
    Tag,
    X
  } from '@lucide/svelte';

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
    try {
      coverImage = decodeURIComponent(coverImage);
    } catch {
      return null;
    }
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
    replaceState(u, {});
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

  $: pageNumbers = getPageNumbers(currentPage, totalPages);
  $: selectedCategoryName = selectedCategory === 'all'
    ? 'All Categories'
    : categories.find(c => String(c.id) === String(selectedCategory))?.name || 'All Categories';

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
        <BookOpen class="w-5 h-5 text-white" strokeWidth={1.5} aria-hidden="true" />
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
          <LayoutGrid class="w-3.5 h-3.5" aria-hidden="true" />Grid
        </button>
        <button on:click={() => viewType = 'table'} type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all"
          style="{viewType === 'table' ? 'background: #F5F0E8; color: #0D5C29;' : 'color: rgba(245,240,232,0.6);'}">
          <List class="w-3.5 h-3.5" aria-hidden="true" />List
        </button>
      </div>
    </div>
  </div>

  <!-- ── Filter Card ── -->
  <div class="rounded-xl shadow-sm p-2 sm:p-4 border" style="background: #F5F0E8; border-color: #D4C4A8;">
    <form on:submit|preventDefault={performSearch} class="flex gap-2 items-center">
      <div class="relative flex-1 min-w-0">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style="color: #9A7A5A;" aria-hidden="true" />
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
            <X class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button type="submit" disabled={loading}
        class="h-11 px-3 sm:px-5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60 flex-shrink-0"
        style="background: #0D5C29; color: #F5F0E8;">
        <Search class="w-4 h-4" aria-hidden="true" />
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
          <Tag class="w-4 h-4 flex-shrink-0" style="color: #9A7A5A;" aria-hidden="true" />
          <span class="flex-1 text-left truncate text-sm">{selectedCategoryName}</span>
          <ChevronDown class="w-3.5 h-3.5 flex-shrink-0 transition-transform {showCategoryDropdown ? 'rotate-180' : ''}" strokeWidth={2.5} style="color: #9A7A5A;" aria-hidden="true" />
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
                  <Check class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} style="color: #0D5C29;" aria-hidden="true" />
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
          <LayoutGrid class="w-4 h-4" aria-hidden="true" />
        </button>
        <button on:click={() => viewType = 'table'} type="button" aria-label="List view"
          class="px-3 py-2 rounded-md transition-all"
          style="{viewType === 'table' ? 'background: #0D5C29; color: #fff;' : 'color: #9A7A5A;'}">
          <List class="w-4 h-4" aria-hidden="true" />
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
                <X class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          {/if}
          {#if selectedCategory !== 'all'}
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border"
              style="background: #EFF5EF; border-color: #B8D4B8; color: #0D5C29;">
              {selectedCategoryName}
              <button on:click={() => selectCategory('all')} type="button" aria-label="Clear category filter">
                <X class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
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
      <CircleAlert class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span class="flex-1 text-sm">{error}</span>
      <button on:click={() => error = ""} aria-label="Close">
        <X class="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
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
        <BookOpen class="w-8 h-8" strokeWidth={1.5} aria-hidden="true" />
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
        <ItemCard
            title={book.title}
            author={book.author}
            year={book.publishedYear}
            subtitle={book.category ?? book.publisher ?? null}
            coverImageUrl={getCoverUrl(book)}
            availableCopies={book.availableCopies}
            totalCopies={book.totalCopies}
            isReserved={reservedBookIds.includes(book.id)}
            isBorrowed={borrowedBookIds.includes(book.id)}
            requesting={actionLoading}
            cancelling={cancellingBookId === book.id}
            busy={actionLoading}
            requestLabel="Reserve"
            onSelect={() => openBookModal(book)}
            onRequest={() => { void handleBookAction(book); }}
            onCancel={() => { void handleCancelReserve(book); }}
          />
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
                            <BookIcon class="w-4 h-4 text-white/30" aria-hidden="true" />
                          </div>
                        {/if}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-bold leading-5 line-clamp-2 min-h-10" style="color: #1A3A1A;">{book.title}</p>
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
                          <Check class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />Borrowed
                        </span>
                      {:else if isReserved}
                        <span class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
                          style="background: #F5EDD8; color: #B06A00; border-color: #D4B87A;">
                          <Clock class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />Reserved
                        </span>
                        <button on:click={() => handleCancelReserve(book)} disabled={isCancelling} type="button" title="Cancel"
                          class="w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50"
                          style="background: #F5EAEA; border-color: #D4A8A8; color: #A83232;"
                          on:mouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EDD0D0'; }}
                          on:mouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5EAEA'; }}>
                          {#if isCancelling}
                            <span class="w-3 h-3 border rounded-full animate-spin" style="border-color: #D4A8A8; border-top-color: #A83232;"></span>
                          {:else}
                            <X class="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
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
                          <Eye class="w-3.5 h-3.5" aria-hidden="true" />
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
          <ChevronLeft class="w-3.5 h-3.5" aria-hidden="true" />Prev
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
          Next<ChevronRight class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    {/if}
  {/if}
</div>

{#if selectedBook}
  <BookModal book={selectedBook} {reservedBookIds} {borrowedBookIds} {actionLoading}
    onClose={() => selectedBook = null} onReserve={handleBookAction} onCancelReserve={handleCancelReserve}/>
{/if}