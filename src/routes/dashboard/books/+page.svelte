<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import Layout from "$lib/components/ui/layout.svelte";
  
  export let data;
  const currentUser = data.user;

  interface Book {
    id: number;
    bookId: string;
    title: string;
    author: string;
    publishedYear: number;
    copiesAvailable: number;
    category?: string;
    publisher?: string;
    location?: string;
    description?: string;
    language?: string;
    status?: string;
  }

  let books: Book[] = [];
  let searchTerm = "";
  let selectedCategory = "all";
  let loading = false;
  let error = "";
  let selectedBook: Book | null = null;
  let actionLoading = false;
  let reservedBookIds: number[] = [];
  let borrowedBookIds: number[] = [];

  let alreadyBorrowed = false;
  let alreadyReserved = false;

  // Add status to books dynamically
  $: books.forEach(book => {
    book.status = book.copiesAvailable > 5 ? 'Available' : 
                  book.copiesAvailable > 0 ? 'Limited' : 'Unavailable';
  });

  async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
    const options: RequestInit = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(endpoint, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function fetchUserBookStatus() {
    try {
      const res = await apiCall(`/api/books/transaction?userId=${currentUser.id}`);
      reservedBookIds = res.reservedBookIds || [];
      borrowedBookIds = res.borrowedBookIds || [];
      if (selectedBook) {
        alreadyReserved = reservedBookIds.includes(selectedBook.id);
        alreadyBorrowed = borrowedBookIds.includes(selectedBook.id);
      }
    } catch (err) {
      reservedBookIds = [];
      borrowedBookIds = [];
      alreadyReserved = false;
      alreadyBorrowed = false;
    }
  }

  let currentPage = 1;
  let totalPages = 1;
  let totalBooks = 0;
  const PAGE_SIZE = 10;

  async function fetchBooks(page = 1) {
    if (!browser) return;
    loading = true;
    error = "";
    currentPage = page;

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('search', searchTerm || '');
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

      const data = await apiCall(`/api/books?${params.toString()}`);
      books = data.data.books;
      totalPages = data.data.pagination.totalPages || 1;
      totalBooks = data.data.pagination.totalBooks || 0;
      await fetchUserBookStatus();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch books';
      books = [];
    } finally {
      loading = false;
    }
  }

  async function handleBookAction(book: Book) {
    if (actionLoading) return;
    if (reservedBookIds.includes(book.id)) {
      error = "You have already reserved this book.";
      return;
    }
    if (borrowedBookIds.includes(book.id)) {
      error = "You have already borrowed this book.";
      return;
    }
    const confirmMsg = `Reserve "${book.title}"? You'll be notified when available.`;
    if (!confirm(confirmMsg)) return;
    actionLoading = true;
    try {
      const data = await apiCall('/api/books/transaction', 'POST', {
        bookId: book.id,
        userId: currentUser.id
      });
      alert(`Successfully reserved "${book.title}". Queue position: ${data.data.queuePosition}`);
      selectedBook = null;
      await fetchBooks(currentPage);
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to reserve book`;
    } finally {
      actionLoading = false;
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'Available': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Limited': 'bg-amber-100 text-amber-800 border-amber-200',
      'Unavailable': 'bg-slate-200 text-slate-700 border-slate-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchInputValue = "";

  // Remove debounce logic and input handler
  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      performSearch();
    }
  }

  function performSearch() {
    searchTerm = searchInputValue;
    currentPage = 1;
    fetchBooks(1);
  }

  function clearSearch() {
    searchInputValue = '';
    searchTerm = '';
    currentPage = 1;
    fetchBooks(1);
  }

  function openBookModal(book: Book) {
    selectedBook = book;
    alreadyReserved = reservedBookIds.includes(book.id);
    alreadyBorrowed = borrowedBookIds.includes(book.id);
  }

  let viewType: 'grid' | 'table' = 'grid';

  let categories: { id: number; name: string; description?: string }[] = [];
  let categoriesLoaded = false;

  async function fetchCategories() {
    try {
      const res = await fetch('/api/books/categories', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data.categories)) {
        categories = data.data.categories;
      } else {
        categories = [];
      }
      categoriesLoaded = true;
    } catch (err) {
      categories = [];
      categoriesLoaded = true;
    }
  }

  onMount(() => {
    fetchCategories();
    fetchBooks();
  });

  // Add for custom dropdown
  let showCategoryDropdown = false;
  let categoryDropdownRef: HTMLDivElement | null = null;

  function selectCategory(catId: string) {
    selectedCategory = catId;
    showCategoryDropdown = false;
    currentPage = 1;
    fetchBooks(1);
  }

  function handleDropdownBlur(event: FocusEvent) {
    // Close dropdown if focus moves outside
    if (!categoryDropdownRef?.contains(event.relatedTarget as Node)) {
      showCategoryDropdown = false;
    }
  }
</script>

<Layout>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
    <div class="max-w-7xl mx-auto px-3 py-6 sm:px-6 sm:py-10">
      <!-- Enhanced Header Section -->
      <div class="mb-6 sm:mb-10">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Library Collection</h1>
            <p class="text-slate-600 mt-2 text-sm sm:text-base flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Discover and reserve books from our collection
            </p>
          </div>
          
          <!-- Enhanced View Toggle -->
          <div class="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              class:bg-white={viewType === 'grid'}
              class:shadow-sm={viewType === 'grid'}
              class:text-slate-900={viewType === 'grid'}
              class:text-slate-600={viewType !== 'grid'}
              on:click={() => viewType = 'grid'}
              aria-label="Grid view"
              type="button"
            >
              <svg class="inline w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Grid
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              class:bg-white={viewType === 'table'}
              class:shadow-sm={viewType === 'table'}
              class:text-slate-900={viewType === 'table'}
              class:text-slate-600={viewType !== 'table'}
              on:click={() => viewType = 'table'}
              aria-label="Table view"
              type="button"
            >
              <svg class="inline w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      <!-- Enhanced Search and Filter Bar -->
      <div class="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
        <div class="flex flex-col gap-4 sm:flex-row">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Search Books</label>
            <form class="relative flex" on:submit|preventDefault={performSearch}>
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by title, author, or ID..."
                bind:value={searchInputValue}
                disabled={loading}
                class="block w-full pl-11 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm transition-all placeholder:text-slate-400"
                autocomplete="off"
              />
              <button
                type="submit"
                class="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-2 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all flex items-center justify-center"
                disabled={loading}
                aria-label="Search"
                tabindex="-1"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {#if searchInputValue}
                <button
                  on:click={clearSearch}
                  class="absolute inset-y-0 right-12 flex items-center text-slate-400 hover:text-slate-600"
                  type="button"
                  aria-label="Clear search"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {/if}
            </form>
          </div>
          <div class="sm:w-64 relative" tabindex="0" on:blur={handleDropdownBlur}>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <button
              type="button"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-left text-sm flex justify-between items-center focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              on:click={() => showCategoryDropdown = !showCategoryDropdown}
              disabled={loading || !categoriesLoaded}
              aria-haspopup="listbox"
              aria-expanded={showCategoryDropdown}
            >
              <span>
                {#if selectedCategory === 'all'}
                  All Categories
                {:else}
                  {#if categoriesLoaded}
                    {#each categories as cat}
                      {#if String(cat.id) === String(selectedCategory)}
                        {cat.name}
                      {/if}
                    {/each}
                  {/if}
                {/if}
              </span>
              <svg class="w-4 h-4 ml-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {#if showCategoryDropdown}
              <div
                bind:this={categoryDropdownRef}
                class="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto"
                tabindex="-1"
              >
                <div
                  class="px-4 py-2 cursor-pointer hover:bg-slate-100 text-sm rounded-t-xl"
                  on:click={() => selectCategory('all')}
                  class:bg-slate-100={selectedCategory === 'all'}
                >
                  All Categories
                </div>
                {#if categoriesLoaded}
                  {#each categories as cat}
                    <div
                      class="px-4 py-2 cursor-pointer hover:bg-slate-100 text-sm"
                      class:bg-slate-100={String(cat.id) === String(selectedCategory)}
                      on:click={() => selectCategory(String(cat.id))}
                    >
                      {cat.name}
                    </div>
                  {/each}
                {:else}
                  <div class="px-4 py-2 text-slate-400 text-sm">Loading...</div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Error Display -->
      {#if error}
        <div class="bg-rose-50 border-l-4 border-rose-500 text-rose-800 px-4 py-3 rounded-lg mb-6 flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">{error}</span>
          </div>
          <button on:click={() => error = ""} class="text-rose-400 hover:text-rose-600 transition-colors">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}

      <!-- Enhanced Stats Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-200">
        <div class="text-sm text-slate-700 mb-2 sm:mb-0 font-medium">
          Showing <span class="text-slate-900 font-bold">{books.length}</span> of <span class="text-slate-900 font-bold">{totalBooks}</span> books
          {#if searchTerm}
            <span class="text-slate-500">for "{searchTerm}"</span>
          {/if}
        </div>
        {#if loading}
          <div class="flex items-center text-slate-600">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600 mr-2"></div>
            <span class="text-sm font-medium">Loading books...</span>
          </div>
        {/if}
      </div>

      <!-- Books Grid or Enhanced Table -->
      {#if !loading}
        {#if books.length > 0}
          {#if viewType === 'grid'}
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {#each books as book (book.id)}
                <div class="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col h-full">
                  <!-- Book Cover -->
                  <div class="h-36 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
                    <svg class="h-20 w-20 text-slate-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    <button
                      on:click={() => openBookModal(book)}
                      class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white transition-all hover:scale-110"
                      aria-label="View details"
                    >
                      <svg class="h-4 w-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div class="p-3 flex-grow flex flex-col">
                    <!-- Status Badge -->
                    <div class="mb-2">
                      <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(book.status || 'Unknown')}`}>
                        <span class="w-1.5 h-1.5 rounded-full mr-1.5 {book.status === 'Available' ? 'bg-emerald-500' : book.status === 'Limited' ? 'bg-amber-500' : 'bg-slate-500'}"></span>
                        {book.status}
                      </span>
                    </div>
                    
                    <!-- Book Info -->
                    <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 text-base leading-tight group-hover:text-slate-700 transition-colors">{book.title}</h3>
                    <p class="text-slate-600 mb-2 text-xs">by {book.author}</p>
                    
                    <div class="flex justify-between items-center text-xs text-slate-500 mb-2 pt-1 border-t border-slate-100">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 012 2z"/>
                        </svg>
                        {book.publishedYear}
                      </span>
                      <span class="flex items-center gap-1 font-medium" class:text-emerald-600={book.copiesAvailable > 5} class:text-amber-600={book.copiesAvailable > 0 && book.copiesAvailable <= 5} class:text-slate-400={book.copiesAvailable === 0}>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        {book.copiesAvailable} available
                      </span>
                    </div>
                    
                    <!-- Reserve button -->
                    <button
                      on:click={() => handleBookAction(book)}
                      disabled={actionLoading || reservedBookIds.includes(book.id) || borrowedBookIds.includes(book.id)}
                      class={`w-full py-2 text-xs font-semibold rounded-lg transition-all mt-auto transform hover:scale-[1.02] active:scale-[0.98]
                        ${borrowedBookIds.includes(book.id)
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : reservedBookIds.includes(book.id)
                            ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-md'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl'}
                        disabled:opacity-70 disabled:transform-none`}
                    >
                      {#if borrowedBookIds.includes(book.id)}
                        ✓ Already Borrowed
                      {:else if reservedBookIds.includes(book.id)}
                        ✓ Reserved
                      {:else}
                        {actionLoading ? 'Processing...' : 'Reserve Book'}
                      {/if}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Enhanced Custom Table View -->
            <div class="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead>
                    <tr class="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <th class="px-3 py-2 text-left">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                          </svg>
                          Book Details
                        </div>
                      </th>
                      <th class="px-3 py-2 text-left">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                          Author
                        </div>
                      </th>
                      <th class="px-3 py-2 text-left">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 012 2z"/>
                          </svg>
                          Year
                        </div>
                      </th>
                      <th class="px-3 py-2 text-left">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Availability
                      </div>
                      <th class="px-3 py-2 text-left">
                        <div class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Status
                        </div>
                      </th>
                      <th class="px-3 py-2 text-center">
                        <div class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Actions
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each books as book (book.id)}
                      <tr class="hover:bg-slate-50 transition-colors group">
                        <td class="px-3 py-3">
                          <div class="flex items-center gap-2">
                            <div class="flex-shrink-0 w-8 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                              <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="font-medium text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-1 text-sm">{book.title}</p>
                              <p class="text-xs text-slate-500 mt-0.5">ID: {book.bookId}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-3 py-3">
                          <div class="text-sm text-slate-700 font-medium">{book.author}</div>
                        </td>
                        <td class="px-3 py-3">
                          <div class="text-sm text-slate-600">{book.publishedYear}</div>
                        </td>
                        <td class="px-3 py-3">
                          <div class="flex items-center gap-2">
                            <div class="flex-shrink-0 w-2 h-2 rounded-full {book.copiesAvailable > 5 ? 'bg-emerald-500' : book.copiesAvailable > 0 ? 'bg-amber-500' : 'bg-slate-400'}"></div>
                            <span class="text-sm font-semibold" class:text-emerald-600={book.copiesAvailable > 5} class:text-amber-600={book.copiesAvailable > 0 && book.copiesAvailable <= 5} class:text-slate-400={book.copiesAvailable === 0}>
                              {book.copiesAvailable} copies
                            </span>
                          </div>
                        </td>
                        <td class="px-3 py-3">
                          <span class={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(book.status || 'Unknown')}`}>
                            {book.status}
                          </span>
                        </td>
                        <td class="px-3 py-3">
                          <div class="flex items-center justify-center gap-2">
                            <button
                              on:click={() => handleBookAction(book)}
                              disabled={actionLoading || reservedBookIds.includes(book.id) || borrowedBookIds.includes(book.id)}
                              class={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                                ${borrowedBookIds.includes(book.id)
                                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                  : reservedBookIds.includes(book.id)
                                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'}
                                disabled:opacity-70`}
                            >
                              {#if borrowedBookIds.includes(book.id)}
                                ✓ Borrowed
                              {:else if reservedBookIds.includes(book.id)}
                                ✓ Reserved
                              {:else}
                                {actionLoading ? 'Processing...' : 'Reserve'}
                              {/if}
                            </button>
                            <button
                              on:click={() => openBookModal(book)}
                              class="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                              aria-label="View details"
                            >
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
          
          <!-- Enhanced Pagination Controls -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 bg-white rounded-xl px-6 py-4 shadow-sm border border-slate-200">
            <div class="text-sm text-slate-600">
              Page <span class="font-bold text-slate-900">{currentPage}</span> of <span class="font-bold text-slate-900">{totalPages}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                on:click={() => fetchBooks(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Previous
              </button>
              
              <div class="hidden sm:flex items-center gap-1">
                {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                  if (totalPages <= 5) return i + 1;
                  if (currentPage <= 3) return i + 1;
                  if (currentPage >= totalPages - 2) return totalPages - 4 + i;
                  return currentPage - 2 + i;
                }) as pageNum}
                  <button
                    class="px-3 py-2 rounded-lg text-sm font-medium transition-all {pageNum === currentPage ? 'bg-slate-900 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}"
                    on:click={() => fetchBooks(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </button>
                {/each}
              </div>
              
              <button
                class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                on:click={() => fetchBooks(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
                <svg class="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        {:else}
          <div class="text-center py-16 bg-white rounded-2xl shadow-lg border border-slate-200">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
              <svg class="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2">No books found</h3>
            <p class="text-slate-600 max-w-md mx-auto">
              {#if searchTerm}
                No results found for "{searchTerm}". Try a different search term.
              {:else}
                Try adjusting your search or filter criteria to find what you're looking for
              {/if}
            </p>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Enhanced Book Details Modal -->
    {#if selectedBook}
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" on:click={() => selectedBook = null}>
        <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp" on:click|stopPropagation>
          <!-- Modal Header -->
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between z-10">
            <div class="flex-1 pr-4">
              <h3 class="text-2xl font-bold text-slate-900 leading-tight">{selectedBook.title}</h3>
              <p class="text-slate-600 mt-1">by {selectedBook.author}</p>
            </div>
            <button 
              on:click={() => selectedBook = null} 
              class="flex-shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all" 
              aria-label="Close"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-6">
            <!-- Status Badge -->
            <div>
              <span class={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(selectedBook.status || 'Unknown')}`}>
                <span class="w-2 h-2 rounded-full mr-2 {selectedBook.status === 'Available' ? 'bg-emerald-500' : selectedBook.status === 'Limited' ? 'bg-amber-500' : 'bg-slate-500'}"></span>
                {selectedBook.status}
              </span>
            </div>

            <!-- Book Details Grid -->
            <div class="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-5">
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Book ID</span>
                <span class="text-slate-900 font-medium">{selectedBook.bookId}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Published Year</span>
                <span class="text-slate-900 font-medium">{selectedBook.publishedYear}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Copies Available</span>
                <span class="text-slate-900 font-medium {selectedBook.copiesAvailable > 5 ? 'text-emerald-600' : selectedBook.copiesAvailable > 0 ? 'text-amber-600' : 'text-slate-400'}">
                  {selectedBook.copiesAvailable}
                </span>
              </div>
              {#if selectedBook.language}
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Language</span>
                  <span class="text-slate-900 font-medium">{selectedBook.language}</span>
                </div>
              {/if}
              {#if selectedBook.category}
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</span>
                  <span class="text-slate-900 font-medium">{selectedBook.category}</span>
                </div>
              {/if}
              {#if selectedBook.publisher}
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Publisher</span>
                  <span class="text-slate-900 font-medium">{selectedBook.publisher}</span>
                </div>
              {/if}
            </div>

            <!-- Description -->
            {#if selectedBook.description}
              <div>
                <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Description</h4>
                <p class="text-slate-600 leading-relaxed">{selectedBook.description}</p>
              </div>
            {/if}

            <!-- Location -->
            {#if selectedBook.location}
              <div class="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <div>
                  <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Location</p>
                  <p class="text-blue-900 font-medium">{selectedBook.location}</p>
                </div>
              </div>
            {/if}
          </div>

          <!-- Modal Footer -->
          <div class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3">
            <button
              on:click={() => selectedBook && handleBookAction(selectedBook)}
              disabled={actionLoading || !selectedBook || reservedBookIds.includes(selectedBook?.id || 0) || borrowedBookIds.includes(selectedBook?.id || 0)}
              class={`flex-1 py-3.5 px-6 font-semibold rounded-xl transition-all text-sm
                ${selectedBook && borrowedBookIds.includes(selectedBook.id)
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : selectedBook && reservedBookIds.includes(selectedBook.id)
                    ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-md'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl'}
                disabled:opacity-70`}
            >
              {#if selectedBook && borrowedBookIds.includes(selectedBook.id)}
                ✓ Already Borrowed
              {:else if selectedBook && reservedBookIds.includes(selectedBook.id)}
                ✓ Reserved
              {:else}
                {actionLoading ? 'Processing...' : 'Reserve This Book'}
              {/if}
            </button>
            <button
              on:click={() => selectedBook = null}
              class="px-6 py-3.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-slate-400 transition-all text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Layout>

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }
</style>