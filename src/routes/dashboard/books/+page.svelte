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

  $: filteredBooks = books.filter(book => {
    const searchMatch = !searchTerm || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.bookId.includes(searchTerm);
    const categoryMatch = selectedCategory === 'all' || book.category === selectedCategory;
    return searchMatch && categoryMatch;
  });

  $: filteredBooks.forEach(book => {
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

  async function fetchBooks() {
    if (!browser) return;
    loading = true;
    error = "";

    try {
      const data = await apiCall('/api/books');
      books = data.data.books;
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
      await fetchBooks();
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to reserve book`;
    } finally {
      actionLoading = false;
    }
  }

  function getStatusColor(status: string) {
    const colors = {
      'Available': 'bg-slate-100 text-slate-800',
      'Limited': 'bg-slate-200 text-slate-800',
      'Unavailable': 'bg-slate-300 text-slate-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  }

  let searchTimeout: NodeJS.Timeout;
  $: if (browser && searchTerm) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fetchBooks(), 300);
  }

  function openBookModal(book: Book) {
    selectedBook = book;
    alreadyReserved = reservedBookIds.includes(book.id);
    alreadyBorrowed = borrowedBookIds.includes(book.id);
  }

  onMount(() => {
    fetchBooks();
  });
</script>

<Layout>
  <div class="min-h-screen bg-white">
    <div class="max-w-full mx-auto px-2 py-4 sm:px-4 sm:py-8">
      <!-- Header Section -->
      <div class="mb-4 sm:mb-8">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">Library Collection</h1>
            <p class="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Discover and reserve books in our collection</p>
          </div>
          <!-- Removed welcome user box -->
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-6 mb-4 sm:mb-8">
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Search Books</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by title, author, or ID..."
                bind:value={searchTerm}
                disabled={loading}
                class="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm transition-all"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Filter by Category</label>
            <select
              bind:value={selectedCategory}
              disabled={loading}
              class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white w-full text-sm"
            >
              <option value="all">All Categories</option>
              <!-- Add category options dynamically -->
            </select>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      {#if error}
        <div class="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg mb-4 flex items-center justify-between">
          <div class="flex items-center">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs sm:text-sm">{error}</span>
          </div>
          <button on:click={() => error = ""} class="text-rose-400 hover:text-rose-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}

      <!-- Stats and Loading -->
      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
        <div class="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-0">
          Showing <span class="font-medium">{filteredBooks.length}</span> books
        </div>
        {#if loading}
          <div class="flex items-center text-slate-600">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600 mr-2"></div>
            <span class="text-xs sm:text-sm">Loading books...</span>
          </div>
        {/if}
      </div>

      <!-- Books Grid -->
      {#if !loading}
        {#if filteredBooks.length > 0}
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {#each filteredBooks as book (book.id)}
              <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full">
                <!-- Book Cover -->
                <div class="h-36 sm:h-44 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-center relative">
                  <svg class="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                  <div class="absolute top-2 right-2 sm:top-3 sm:right-3">
                    <button
                      on:click={() => openBookModal(book)}
                      class="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-colors"
                      aria-label="View details"
                    >
                      <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div class="p-3 sm:p-5 flex-grow flex flex-col">
                  <!-- Status Badge -->
                  <div class="flex items-center justify-between mb-2 sm:mb-3">
                    <span class={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status || 'Unknown')}`}>
                      {book.status}
                    </span>
                  </div>
                  
                  <!-- Book Info -->
                  <h3 class="font-bold text-slate-900 mb-1 line-clamp-2 text-base sm:text-lg">{book.title}</h3>
                  <p class="text-slate-600 mb-1 sm:mb-2 text-xs sm:text-sm">by {book.author}</p>
                  <div class="flex justify-between items-center text-xs text-slate-500 mb-2 sm:mb-4">
                    <span>{book.publishedYear}</span>
                    <span>{book.copiesAvailable} available</span>
                  </div>
                  
                  <!-- Reserve button -->
                  <button
                    on:click={() => handleBookAction(book)}
                    disabled={actionLoading || reservedBookIds.includes(book.id) || borrowedBookIds.includes(book.id)}
                    class={`w-full py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors mt-auto
                      ${borrowedBookIds.includes(book.id)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : reservedBookIds.includes(book.id)
                          ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                          : 'bg-slate-800 text-white hover:bg-slate-900'}
                      disabled:opacity-70`}
                  >
                    {#if borrowedBookIds.includes(book.id)}
                      Already Borrowed
                    {:else if reservedBookIds.includes(book.id)}
                      Reserved
                    {:else}
                      {actionLoading ? 'Processing...' : 'Reserve'}
                    {/if}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 sm:py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <svg class="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3 class="mt-2 sm:mt-4 text-lg sm:text-xl font-medium text-slate-900">No books found</h3>
            <p class="mt-1 sm:mt-2 text-slate-500 text-xs sm:text-base">Try adjusting your search or filter criteria</p>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Book Details Modal -->
    {#if selectedBook}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50" on:click={() => selectedBook = null}>
        <div class="bg-white rounded-xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
          <div class="p-4 sm:p-6">
            <div class="flex items-start justify-between mb-3 sm:mb-4">
              <h3 class="text-lg sm:text-xl font-bold text-slate-900">{selectedBook.title}</h3>
              <button on:click={() => selectedBook = null} class="text-slate-400 hover:text-slate-600" aria-label="Close">
                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <p class="text-slate-600 text-xs sm:text-base">by {selectedBook.author}</p>
              
              <div class="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div class="flex items-center">
                  <span class="font-medium text-slate-500 w-20 sm:w-24">Book ID:</span>
                  <span class="text-slate-700">{selectedBook.bookId}</span>
                </div>
                <div class="flex items-center">
                  <span class="font-medium text-slate-500 w-20 sm:w-24">Year:</span>
                  <span class="text-slate-700">{selectedBook.publishedYear}</span>
                </div>
                <div class="flex items-center">
                  <span class="font-medium text-slate-500 w-20 sm:w-24">Available:</span>
                  <span class="text-slate-700">{selectedBook.copiesAvailable}</span>
                </div>
                {#if selectedBook.language}
                  <div class="flex items-center">
                    <span class="font-medium text-slate-500 w-20 sm:w-24">Language:</span>
                    <span class="text-slate-700">{selectedBook.language}</span>
                  </div>
                {/if}
              </div>

              {#if selectedBook.description}
                <div>
                  <span class="font-medium text-slate-700 block mb-1">Description:</span>
                  <p class="text-slate-600 text-xs sm:text-sm">{selectedBook.description}</p>
                </div>
              {/if}
            </div>

            <!-- Modal Actions -->
            <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                on:click={() => handleBookAction(selectedBook)}
                disabled={actionLoading || reservedBookIds.includes(selectedBook.id) || borrowedBookIds.includes(selectedBook.id)}
                class={`flex-1 py-2 sm:py-3 px-3 sm:px-4 font-medium rounded-lg transition-colors text-xs sm:text-sm
                  ${borrowedBookIds.includes(selectedBook.id)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : reservedBookIds.includes(selectedBook.id)
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-slate-800 text-white hover:bg-slate-900'}
                  disabled:opacity-70`}
              >
                {#if borrowedBookIds.includes(selectedBook.id)}
                  Already Borrowed
                {:else if reservedBookIds.includes(selectedBook.id)}
                  Reserved
                {:else}
                  {actionLoading ? 'Processing...' : 'Reserve Book'}
                {/if}
              </button>
              <button
                on:click={() => selectedBook = null}
                class="px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Layout>