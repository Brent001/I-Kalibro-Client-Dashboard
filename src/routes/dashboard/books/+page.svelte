<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import Layout from "$lib/components/ui/layout.svelte";
  
  export let data; // From page.server.ts load function
  
  // User from server load
  const currentUser = data.user;
  
  // Types
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
  
  // State
  let books: Book[] = [];
  let searchTerm = "";
  let selectedCategory = "all";
  let loading = false;
  let error = "";
  let selectedBook: Book | null = null;
  let actionLoading = false;
  
  // Reactive computed values
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
  
  // API Functions
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
  
  async function fetchBooks() {
    if (!browser) return;
    loading = true;
    error = "";
    
    try {
      const data = await apiCall('/api/books');
      books = data.data.books;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch books';
      books = [];
    } finally {
      loading = false;
    }
  }
  
  // Action Functions
  async function handleBookAction(book: Book, action: 'borrow' | 'reserve') {
    if (actionLoading) return;
    
    const confirmMsg = action === 'borrow' 
      ? `Borrow "${book.title}"?` 
      : `Reserve "${book.title}"? You'll be notified when available.`;
    
    if (!confirm(confirmMsg)) return;
    
    actionLoading = true;
    
    try {
      const method = action === 'borrow' ? 'PUT' : 'POST';
      const data = await apiCall('/api/books/transaction', method, {
        bookId: book.id,
        userId: currentUser.id
      });
      
      const successMsg = action === 'borrow' 
        ? `Successfully borrowed "${book.title}"` 
        : `Successfully reserved "${book.title}". Queue position: ${data.data.queuePosition}`;
      
      alert(successMsg);
      selectedBook = null;
      await fetchBooks();
      
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to ${action} book`;
    } finally {
      actionLoading = false;
    }
  }
  
  // Utility Functions
  function getStatusColor(status: string) {
    const colors = {
      'Available': 'bg-emerald-100 text-emerald-800',
      'Limited': 'bg-amber-100 text-amber-800',
      'Unavailable': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  }
  
  // Debounced search
  let searchTimeout: NodeJS.Timeout;
  $: if (browser && searchTerm) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fetchBooks(), 300);
  }
  
  onMount(() => {
    fetchBooks();
  });
</script>

<Layout>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Library Catalog</h2>
        <p class="text-slate-600">Browse and manage books</p>
      </div>
      <div class="text-sm text-slate-600">
        Welcome, {currentUser.name}
      </div>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div class="flex justify-between items-center">
          <p>{error}</p>
          <button on:click={() => error = ""} class="text-red-400 hover:text-red-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- Search -->
    <div class="bg-white p-4 rounded-xl shadow-sm border">
      <div class="flex gap-4">
        <div class="flex-1">
          <input
            type="text"
            placeholder="Search books..."
            bind:value={searchTerm}
            disabled={loading}
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <select
          bind:value={selectedCategory}
          disabled={loading}
          class="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
        >
          <option value="all">All Categories</option>
          <!-- Add category options here -->
        </select>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
        <p class="mt-2 text-slate-600">Loading books...</p>
      </div>
    {/if}

    <!-- Books Grid -->
    {#if !loading}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each filteredBooks as book}
          <div class="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <!-- Book Cover -->
            <div class="h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-xl flex items-center justify-center">
              <svg class="h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            
            <div class="p-4">
              <!-- Status Badge -->
              <div class="flex items-center justify-between mb-2">
                <span class={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status || 'Unknown')}`}>
                  {book.status}
                </span>
                <button
                  on:click={() => selectedBook = book}
                  class="text-slate-400 hover:text-slate-600"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
              
              <!-- Book Info -->
              <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2">{book.title}</h3>
              <p class="text-sm text-slate-600 mb-2">by {book.author}</p>
              <p class="text-xs text-slate-400 mb-3">
                {book.publishedYear} • {book.copiesAvailable} available
              </p>
              
              <!-- Action Button -->
              {#if book.copiesAvailable > 0}
                <button
                  on:click={() => handleBookAction(book, 'borrow')}
                  disabled={actionLoading}
                  class="w-full px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Borrow'}
                </button>
              {:else}
                <button
                  on:click={() => handleBookAction(book, 'reserve')}
                  disabled={actionLoading}
                  class="w-full px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Reserve'}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      
      {#if filteredBooks.length === 0}
        <div class="text-center py-8">
          <p class="text-slate-500">No books found matching your criteria.</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Book Details Modal -->
  {#if selectedBook}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" on:click={() => selectedBook = null}>
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <h3 class="text-2xl font-bold text-slate-900">{selectedBook.title}</h3>
            <button on:click={() => selectedBook = null} class="text-slate-400 hover:text-slate-600">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <p class="text-lg text-slate-600">by {selectedBook.author}</p>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><span class="font-medium">Book ID:</span> {selectedBook.bookId}</div>
              <div><span class="font-medium">Year:</span> {selectedBook.publishedYear}</div>
              <div><span class="font-medium">Available:</span> {selectedBook.copiesAvailable}</div>
              {#if selectedBook.language}
                <div><span class="font-medium">Language:</span> {selectedBook.language}</div>
              {/if}
            </div>

            {#if selectedBook.description}
              <div>
                <span class="font-medium">Description:</span>
                <p class="mt-1">{selectedBook.description}</p>
              </div>
            {/if}
          </div>

          <!-- Modal Actions -->
          <div class="flex gap-3 mt-6">
            {#if selectedBook.copiesAvailable > 0}
              <button
                on:click={() => handleBookAction(selectedBook, 'borrow')}
                disabled={actionLoading}
                class="flex-1 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Borrow Book'}
              </button>
            {:else}
              <button
                on:click={() => handleBookAction(selectedBook, 'reserve')}
                disabled={actionLoading}
                class="flex-1 px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Reserve Book'}
              </button>
            {/if}
            <button
              on:click={() => selectedBook = null}
              class="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Layout>