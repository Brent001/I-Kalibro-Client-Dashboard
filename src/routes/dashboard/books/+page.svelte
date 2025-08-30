<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import Layout from "$lib/components/ui/layout.svelte";

  let searchTerm = "";
  let selectedCategory = "all";
  let loading = false;
  let error = "";
  let showBookDetails = false;
  let selectedBook: Book | null = null;
  let showReserveModal = false;
  let reservingBook: Book | null = null;
  let reservationLoading = false;
  let showBorrowModal = false;
  let borrowingBook: Book | null = null;
  let borrowLoading = false;

  // API response types
  interface Book {
    id: number;
    bookId: string;
    title: string;
    author: string;
    qrCode?: string;
    publishedYear: number;
    copiesAvailable: number;
    categoryId: number;
    category?: string;
    publisher?: string;
    edition?: string;
    location?: string;
    description?: string;
    tags?: string;
    supplier?: string;
    language?: string;
    // Computed fields for display
    status?: string;
  }

  interface ApiResponse {
    success: boolean;
    data: {
      books: Book[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    };
    message?: string;
  }

  let books: Book[] = [];
  let pagination = {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12,
    hasNextPage: false,
    hasPrevPage: false
  };

  // Categories and stats
  let categories = ['all'];
  let stats = {
    totalBooks: 0,
    availableCopies: 0,
    borrowedBooks: 0,
    categoriesCount: 0
  };

  // View mode toggle (grid/list)
  let viewMode: 'grid' | 'list' = 'grid';

  // Reactive statement for filtered books
  $: filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.bookId && book.bookId.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Function to fetch books from API
  async function fetchBooks(page = 1, search = "", category = "") {
    if (!browser) return;
    
    loading = true;
    error = "";
    
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', pagination.limit.toString());
      
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('categoryId', category);
      
      const response = await fetch(`/api/books?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        books = data.data.books.map(book => ({
          ...book,
          status: book.copiesAvailable > 5 ? 'Available' : 
                  book.copiesAvailable > 0 ? 'Limited' : 'Unavailable'
        }));
        pagination = data.data.pagination;
      } else {
        throw new Error(data.message || 'Failed to fetch books');
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      error = err instanceof Error ? err.message : 'An error occurred while fetching books';
      books = [];
    } finally {
      loading = false;
    }
  }

  // Debounced search function
  let searchTimeout: NodeJS.Timeout;
  function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchBooks(1, searchTerm, selectedCategory);
    }, 300);
  }

  // Watch for search changes
  $: if (browser && (searchTerm || selectedCategory !== 'all')) {
    debouncedSearch();
  }

  // Load initial data
  onMount(async () => {
    await Promise.all([
      fetchBooks(),
      fetchCategories(),
      fetchStats()
    ]);
  });

  // Function to fetch categories from API
  async function fetchCategories() {
    if (!browser) return;
    
    try {
      const response = await fetch('/api/books/categories', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          categories = ['all', ...data.data.categories.map(cat => cat.id.toString())];
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  // Function to fetch statistics
  async function fetchStats() {
    if (!browser) return;
    
    try {
      const response = await fetch('/api/books/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          stats = data.data;
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  // Function to borrow a book
  async function borrowBook(book: Book) {
    if (!confirm(`Are you sure you want to borrow "${book.title}"?`)) {
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId: book.id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Successfully borrowed "${book.title}". Due date: ${data.dueDate || data.message || ''}`);
        // Refresh data
        await Promise.all([fetchBooks(), fetchStats()]);
        if (selectedBook && selectedBook.id === book.id) {
          showBookDetails = false;
        }
      } else {
        throw new Error(data.message || 'Failed to borrow book');
      }
    } catch (err) {
      console.error('Error borrowing book:', err);
      error = err instanceof Error ? err.message : 'An error occurred while borrowing the book';
    }
  }

  // Function to reserve a book
  async function reserveBook(book: Book) {
    reservingBook = book;
    showReserveModal = true;
  }

  async function submitReservation() {
    if (!reservingBook) return;
    
    reservationLoading = true;
    
    try {
      const response = await fetch('/api/books/reserve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId: reservingBook.id })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`Successfully reserved "${reservingBook.title}". Position in queue: ${data.data.queuePosition}`);
        showReserveModal = false;
        reservingBook = null;
        await fetchBooks();
      } else {
        throw new Error(data.message || 'Failed to reserve book');
      }
    } catch (err) {
      console.error('Error reserving book:', err);
      error = err instanceof Error ? err.message : 'An error occurred while reserving the book';
    } finally {
      reservationLoading = false;
    }
  }

  // Function to open borrow modal
  function openBorrowModal(book: Book) {
    borrowingBook = book;
    showBorrowModal = true;
  }

  // Function to confirm borrowing a book
  async function confirmBorrow() {
    if (!borrowingBook) return;
    borrowLoading = true;
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: borrowingBook.id })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Successfully borrowed "${borrowingBook.title}". Due date: ${data.dueDate || data.message || ''}`);
        await Promise.all([fetchBooks(), fetchStats()]);
        if (selectedBook && selectedBook.id === borrowingBook.id) showBookDetails = false;
        showBorrowModal = false;
        borrowingBook = null;
      } else {
        throw new Error(data.message || 'Failed to borrow book');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred while borrowing the book';
    } finally {
      borrowLoading = false;
    }
  }

  // Utility functions
  function getStatusColor(status: string) {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800';
      case 'Limited':
        return 'bg-amber-100 text-amber-800';
      case 'Unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }

  function showBook(book: Book) {
    selectedBook = book;
    showBookDetails = true;
  }

  // Pagination handlers
  function goToPage(page: number) {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchBooks(page, searchTerm, selectedCategory);
    }
  }

  function nextPage() {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  }

  function prevPage() {
    if (pagination.hasPrevPage) {
      goToPage(pagination.currentPage - 1);
    }
  }
</script>

<Layout>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Library Catalog</h2>
        <p class="text-slate-600">Browse and borrow books from our collection</p>
      </div>
      
      <!-- View Toggle -->
      <div class="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
        <button
          on:click={() => viewMode = 'grid'}
          class="p-2 rounded-md transition-all duration-200 {viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button
          on:click={() => viewMode = 'list'}
          class="p-2 rounded-md transition-all duration-200 {viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Error Message -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium">Error:</p>
            <p class="text-sm">{error}</p>
          </div>
          <button 
            on:click={() => error = ""} 
            class="text-red-400 hover:text-red-600"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center">
          <div class="p-3 bg-slate-100 rounded-xl">
            <svg class="h-6 w-6 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-slate-600">Total Books</p>
            <p class="text-2xl font-bold text-slate-900">{stats.totalBooks}</p>
          </div>
        </div>
      </div>
      <div class="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center">
          <div class="p-3 bg-emerald-100 rounded-xl">
            <svg class="h-6 w-6 text-emerald-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-slate-600">Available</p>
            <p class="text-2xl font-bold text-slate-900">{stats.availableCopies}</p>
          </div>
        </div>
      </div>
      <div class="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center">
          <div class="p-3 bg-amber-100 rounded-xl">
            <svg class="h-6 w-6 text-amber-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4"/>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-slate-600">My Books</p>
            <p class="text-2xl font-bold text-slate-900">{stats.borrowedBooks}</p>
          </div>
        </div>
      </div>
      <div class="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-xl">
            <svg class="h-6 w-6 text-purple-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-slate-600">Categories</p>
            <p class="text-2xl font-bold text-slate-900">{categories.length - 1}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by title, author, or book ID..."
              bind:value={searchTerm}
              class="pl-10 pr-4 py-3 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors duration-200"
              disabled={loading}
            />
            {#if loading}
              <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
              </div>
            {/if}
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <select
            bind:value={selectedCategory}
            class="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-slate-700 transition-colors duration-200"
            disabled={loading}
          >
            {#each categories as category}
              <option value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading && books.length === 0}
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600"></div>
          <span class="ml-3 text-slate-600">Loading books...</span>
        </div>
      </div>
    {/if}

    <!-- Books Display -->
    {#if !loading || books.length > 0}
      {#if viewMode === 'grid'}
        <!-- Grid View -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each filteredBooks as book}
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 group">
              <!-- Book Cover Placeholder -->
              <div class="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-all duration-300">
                <svg class="h-16 w-16 text-slate-400" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              
              <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                  <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status || 'Unknown')}`}>
                    {book.status || 'Unknown'}
                  </span>
                  <button
                    on:click={() => showBook(book)}
                    class="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
                
                <h3 class="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">{book.title}</h3>
                <p class="text-xs text-slate-600 mb-2">by {book.author}</p>
                <p class="text-xs text-slate-400 mb-3">
                  {book.publishedYear} • {book.copiesAvailable} available
                </p>
                
                <div class="flex space-x-2">
                  {#if book.copiesAvailable > 0}
                    <button
                      on:click={() => openBorrowModal(book)}
                      class="flex-1 px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200"
                    >
                      Borrow
                    </button>
                  {:else}
                    <button
                      on:click={() => reserveBook(book)}
                      class="flex-1 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                    >
                      Reserve
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- List View -->
        <div class="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Book Details</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Availability</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-100">
                {#each filteredBooks as book}
                  <tr class="hover:bg-slate-50 transition-colors duration-200">
                    <td class="px-6 py-4">
                      <div>
                        <div class="text-sm font-semibold text-slate-900">{book.title}</div>
                        <div class="text-sm text-slate-600">by {book.author}</div>
                        <div class="text-xs text-slate-400">ID: {book.bookId} • {book.publishedYear}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-900">
                      <span class="font-semibold">{book.copiesAvailable}</span> available
                    </td>
                    <td class="px-6 py-4">
                      <span class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status || 'Unknown')}`}>
                        {book.status || 'Unknown'}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm font-medium">
                      <div class="flex space-x-3">
                        <button 
                          on:click={() => showBook(book)}
                          class="text-slate-600 hover:text-slate-900 transition-colors duration-200" 
                          title="View Details"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        {#if book.copiesAvailable > 0}
                          <button 
                            on:click={() => borrowBook(book)}
                            class="text-emerald-600 hover:text-emerald-700 transition-colors duration-200" 
                            title="Borrow Book"
                          >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </button>
                        {:else}
                          <button 
                            on:click={() => reserveBook(book)}
                            class="text-amber-600 hover:text-amber-700 transition-colors duration-200" 
                            title="Reserve Book"
                          >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            
            {#if filteredBooks.length === 0 && !loading}
              <div class="text-center py-8">
                <p class="text-slate-500">No books found matching your criteria.</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Pagination -->
    {#if pagination.totalPages > 1}
      <div class="bg-white px-4 lg:px-6 py-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-sm text-slate-700 order-2 sm:order-1">
          Showing <span class="font-semibold">{((pagination.currentPage - 1) * pagination.limit) + 1}</span> to 
          <span class="font-semibold">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span> of
          <span class="font-semibold">{pagination.totalCount}</span> results
        </div>
        <nav class="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px order-1 sm:order-2">
          <button 
            on:click={prevPage}
            disabled={!pagination.hasPrevPage || loading}
            class="relative inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-l-lg text-slate-500 bg-white hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            <span class="hidden sm:inline">Previous</span>
          </button>
          
          <button 
            class="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium text-slate-700 bg-slate-50"
            disabled
          >
            {pagination.currentPage}
          </button>
          
          <button 
            on:click={nextPage}
            disabled={!pagination.hasNextPage || loading}
            class="relative inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-r-lg text-slate-500 bg-white hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="hidden sm:inline">Next</span>
            <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </nav>
      </div>
    {/if}
  </div>

  <!-- Book Details Modal -->
  {#if showBookDetails && selectedBook}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" on:click={() => showBookDetails = false}>
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <h3 class="text-2xl font-bold text-slate-900">{selectedBook.title}</h3>
            <button
              on:click={() => showBookDetails = false}
              class="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Book Cover -->
            <div class="lg:col-span-1">
              <div class="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                <svg class="h-24 w-24 text-slate-400" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
            </div>

            <!-- Book Details -->
            <div class="lg:col-span-2">
              <div class="space-y-4">
                <div>
                  <p class="text-lg text-slate-600 mb-2">by {selectedBook.author}</p>
                  <div class="flex items-center space-x-4">
                    <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBook.status || 'Unknown')}`}>
                      {selectedBook.status || 'Unknown'}
                    </span>
                    <span class="text-sm text-slate-600">{selectedBook.copiesAvailable} copies available</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="font-medium text-slate-600">Book ID:</span>
                    <p class="text-slate-900">{selectedBook.bookId}</p>
                  </div>
                  <div>
                    <span class="font-medium text-slate-600">Published Year:</span>
                    <p class="text-slate-900">{selectedBook.publishedYear}</p>
                  </div>
                  {#if selectedBook.publisher}
                    <div>
                      <span class="font-medium text-slate-600">Publisher:</span>
                      <p class="text-slate-900">{selectedBook.publisher}</p>
                    </div>
                  {/if}
                  {#if selectedBook.edition}
                    <div>
                      <span class="font-medium text-slate-600">Edition:</span>
                      <p class="text-slate-900">{selectedBook.edition}</p>
                    </div>
                  {/if}
                  {#if selectedBook.language}
                    <div>
                      <span class="font-medium text-slate-600">Language:</span>
                      <p class="text-slate-900">{selectedBook.language}</p>
                    </div>
                  {/if}
                  {#if selectedBook.location}
                    <div>
                      <span class="font-medium text-slate-600">Location:</span>
                      <p class="text-slate-900">{selectedBook.location}</p>
                    </div>
                  {/if}
                </div>

                {#if selectedBook.description}
                  <div>
                    <span class="font-medium text-slate-600">Description:</span>
                    <p class="text-slate-900 mt-1">{selectedBook.description}</p>
                  </div>
                {/if}

                {#if selectedBook.tags}
                  <div>
                    <span class="font-medium text-slate-600">Tags:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      {#each selectedBook.tags.split(',') as tag}
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                          {tag.trim()}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Action Buttons -->
              <div class="flex space-x-3 mt-6">
                {#if selectedBook.copiesAvailable > 0}
                  <button
                    on:click={() => openBorrowModal(selectedBook)}
                    class="flex-1 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200"
                  >
                    Borrow Book
                  </button>
                {:else}
                  <button
                    on:click={() => reserveBook(selectedBook)}
                    class="flex-1 px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                  >
                    Reserve Book
                  </button>
                {/if}
                <button
                  on:click={() => showBookDetails = false}
                  class="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Reserve Book Modal -->
  {#if showReserveModal && reservingBook}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" on:click={() => showReserveModal = false}>
      <div class="bg-white rounded-2xl max-w-md w-full shadow-xl" on:click|stopPropagation>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <div class="bg-amber-100 rounded-full p-2 mr-3">
              <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900">Reserve Book</h3>
          </div>
          <p class="text-slate-700 mb-4">
            You are about to reserve <span class="font-semibold text-slate-900">"{reservingBook.title}"</span> by {reservingBook.author}.<br>
            You will be notified when it becomes available.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              on:click={submitReservation}
              disabled={reservationLoading}
              class="flex-1 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if reservationLoading}
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Reserving...
                </div>
              {:else}
                Confirm Reservation
              {/if}
            </button>
            <button
              on:click={() => showReserveModal = false}
              class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Borrow Book Modal -->
  {#if showBorrowModal && borrowingBook}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" on:click={() => showBorrowModal = false}>
      <div class="bg-white rounded-2xl max-w-md w-full shadow-xl" on:click|stopPropagation>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <div class="bg-emerald-100 rounded-full p-2 mr-3">
              <svg class="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900">Borrow Book</h3>
          </div>
          <p class="text-slate-700 mb-4">
            Are you sure you want to borrow <span class="font-semibold text-slate-900">"{borrowingBook.title}"</span> by {borrowingBook.author}?
          </p>
          <div class="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              on:click={confirmBorrow}
              disabled={borrowLoading}
              class="flex-1 px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if borrowLoading}
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Borrowing...
                </div>
              {:else}
                Confirm Borrow
              {/if}
            </button>
            <button
              on:click={() => { showBorrowModal = false; borrowingBook = null; }}
              class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Layout>