<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import Layout from "$lib/components/ui/layout.svelte";
  
  export let data;
  const currentUser = data.user;

  interface Transaction {
    id: number;
    bookId: number;
    bookTitle: string;
    bookAuthor: string;
    dueDate?: string;
    borrowDate?: string;
    reservedDate?: string;
    status?: string;
  }

  let activeTab = 'borrowed';
  let viewMode = 'card';
  let searchTerm = "";
  let loading = false;
  let error = "";

  let borrowedBooks: Transaction[] = [];
  let reservedBooks: Transaction[] = [];
  let overdueBooks: Transaction[] = [];

  $: filteredBorrowed = borrowedBooks.filter(item => {
    const searchMatch = !searchTerm || 
      item.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookId.toString().includes(searchTerm);
    return searchMatch;
  });

  $: filteredReserved = reservedBooks.filter(item => {
    const searchMatch = !searchTerm || 
      item.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookId.toString().includes(searchTerm);
    return searchMatch;
  });

  $: filteredOverdue = overdueBooks.filter(item => {
    const searchMatch = !searchTerm || 
      item.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookId.toString().includes(searchTerm);
    return searchMatch;
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

  async function fetchIssuedBooks() {
    loading = true;
    try {
      const res = await apiCall('/api/issued');
      borrowedBooks = res.borrowed || [];
      reservedBooks = res.reserved || [];
      overdueBooks = res.overdue || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch issued books';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchIssuedBooks();
  });
</script>

<Layout>
  <div class="min-h-screen bg-white">
    <div class="max-w-full mx-auto px-2 py-4 sm:px-4 sm:py-8">
      <!-- Header Section -->
      <div class="mb-4 sm:mb-8">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">My Library</h1>
            <p class="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your borrowed books, reservations, and penalties</p>
          </div>
          <div class="flex items-center">
            <div class="bg-white rounded-xl shadow-sm px-3 py-2 border border-slate-200">
              <p class="text-xs sm:text-sm font-medium text-slate-700">Welcome, {currentUser.name}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-200 mb-6">
        <nav class="flex space-x-8">
          <button 
            class={`py-3 px-1 font-medium text-sm border-b-2 transition-colors duration-200 ${
              activeTab === 'borrowed' 
                ? 'border-slate-800 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            on:click={() => activeTab = 'borrowed'}
          >
            Borrowed Books ({borrowedBooks.length})
          </button>
          <button 
            class={`py-3 px-1 font-medium text-sm border-b-2 transition-colors duration-200 ${
              activeTab === 'reserved' 
                ? 'border-slate-800 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            on:click={() => activeTab = 'reserved'}
          >
            Reserved Books ({reservedBooks.length})
          </button>
          <button 
            class={`py-3 px-1 font-medium text-sm border-b-2 transition-colors duration-200 ${
              activeTab === 'overdue' 
                ? 'border-slate-800 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            on:click={() => activeTab = 'overdue'}
          >
            Overdue Books ({overdueBooks.length})
          </button>
        </nav>
      </div>

      <!-- Search (removed view selector) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-6 mb-4 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="w-full">
            <label class="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Search</label>
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
                class="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      {#if activeTab === 'borrowed'}
        {#if filteredBorrowed.length > 0}
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Book</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Author</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                {#each filteredBorrowed as item (item.id)}
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-slate-900">{item.bookTitle}</div>
                      <div class="text-sm text-slate-500">ID: {item.bookId}</div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{item.bookAuthor}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 sm:py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <svg class="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3 class="mt-2 sm:mt-4 text-lg sm:text-xl font-medium text-slate-900">No borrowed books</h3>
            <p class="mt-1 sm:mt-2 text-slate-500 text-xs sm:text-base">You haven't borrowed any books yet</p>
          </div>
        {/if}
      {:else if activeTab === 'reserved'}
        {#if filteredReserved.length > 0}
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Book</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Author</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reserved Date</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                {#each filteredReserved as item (item.id)}
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-slate-900">{item.bookTitle}</div>
                      <div class="text-sm text-slate-500">ID: {item.bookId}</div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{item.bookAuthor}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.reservedDate ? new Date(item.reservedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        on:click={() => deleteTransaction(item.id, 'reserved')}
                        class="text-rose-600 hover:text-rose-900"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 sm:py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <svg class="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3 class="mt-2 sm:mt-4 text-lg sm:text-xl font-medium text-slate-900">No reserved books</h3>
            <p class="mt-1 sm:mt-2 text-slate-500 text-xs sm:text-base">You haven't reserved any books yet</p>
          </div>
        {/if}
      {:else if activeTab === 'overdue'}
        {#if filteredOverdue.length > 0}
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Book</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Author</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                {#each filteredOverdue as item (item.id)}
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-slate-900">{item.bookTitle}</div>
                      <div class="text-sm text-slate-500">ID: {item.bookId}</div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{item.bookAuthor}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        on:click={() => deleteTransaction(item.id, 'overdue')}
                        class="text-rose-600 hover:text-rose-900"
                      >
                        Acknowledge
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="text-center py-8 sm:py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <svg class="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 sm:mt-4 text-lg sm:text-xl font-medium text-slate-900">No overdue books</h3>
            <p class="mt-1 sm:mt-2 text-slate-500 text-xs sm:text-base">You have no overdue books</p>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</Layout>