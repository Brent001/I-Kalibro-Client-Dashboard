<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let book;
  export let reservedBookIds: number[] = [];
  export let borrowedBookIds: number[] = [];
  export let actionLoading: boolean = false;
  export let onClose: () => void;
  export let onReserve: (book: any) => void;

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'Available': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Limited': 'bg-amber-100 text-amber-800 border-amber-200',
      'Unavailable': 'bg-slate-200 text-slate-700 border-slate-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  let isDesktop = window.matchMedia('(min-width: 640px)').matches;

  function updateIsDesktop() {
    isDesktop = window.matchMedia('(min-width: 640px)').matches;
  }

  onMount(() => {
    document.body.classList.add('overflow-hidden');
    window.addEventListener('resize', updateIsDesktop);
  });

  onDestroy(() => {
    document.body.classList.remove('overflow-hidden');
    window.removeEventListener('resize', updateIsDesktop);
  });

  // Animation state for closing
  let closing = false;

  function handleClose() {
    if (!isDesktop) {
      closing = true;
      setTimeout(() => {
        closing = false;
        onClose();
      }, 300); // match animation duration
    } else {
      onClose();
    }
  }
</script>

{#if book}
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn p-0 sm:p-4" 
    on:click={handleClose}
  >
    <div 
      class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-slideUp flex flex-col mb-16 sm:mb-0 {closing && !isDesktop ? 'animate-slideDown' : ''}" 
      on:click|stopPropagation
    >
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-5 py-3 sm:py-3.5 flex items-start justify-between z-10">
        <div class="flex-1 pr-3">
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{book.title}</h3>
          <p class="text-xs sm:text-sm text-slate-600 mt-0.5">by {book.author}</p>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
        <!-- Status Badge -->
        <span class={`inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${getStatusColor(book.status || 'Unknown')}`}>
          <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1.5 sm:mr-2 {book.status === 'Available' ? 'bg-emerald-500' : book.status === 'Limited' ? 'bg-amber-500' : 'bg-slate-500'}"></span>
          {book.status}
        </span>

        <!-- Book Details Grid -->
        <div class="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
          <div class="flex flex-col">
            <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Book ID</span>
            <span class="text-sm sm:text-base text-slate-900 font-medium">{book.bookId}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Published</span>
            <span class="text-sm sm:text-base text-slate-900 font-medium">{book.publishedYear}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Copies</span>
            <span class="text-sm sm:text-base text-slate-900 font-medium {book.copiesAvailable > 5 ? 'text-emerald-600' : book.copiesAvailable > 0 ? 'text-amber-600' : 'text-slate-400'}">
              {book.copiesAvailable}
            </span>
          </div>
          {#if book.language}
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Language</span>
              <span class="text-sm sm:text-base text-slate-900 font-medium">{book.language}</span>
            </div>
          {/if}
          {#if book.category}
            <div class="flex flex-col col-span-2">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Category</span>
              <span class="text-sm sm:text-base text-slate-900 font-medium">{book.category}</span>
            </div>
          {/if}
          {#if book.publisher}
            <div class="flex flex-col col-span-2">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Publisher</span>
              <span class="text-sm sm:text-base text-slate-900 font-medium">{book.publisher}</span>
            </div>
          {/if}
        </div>

        <!-- Description -->
        {#if book.description}
          <div>
            <h4 class="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide mb-1.5 sm:mb-2">Description</h4>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">{book.description}</p>
          </div>
        {/if}

        <!-- Location -->
        {#if book.location}
          <div class="flex items-start gap-2.5 sm:gap-3 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <div>
              <p class="text-[10px] sm:text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5 sm:mb-1">Location</p>
              <p class="text-xs sm:text-sm text-blue-900 font-medium">{book.location}</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 pb-10 sm:pb-3">
        <button
          on:click={() => onReserve(book)}
          disabled={actionLoading || !book || reservedBookIds.includes(book?.id || 0) || borrowedBookIds.includes(book?.id || 0)}
          class={`flex-1 py-2.5 sm:py-3 px-4 sm:px-5 font-semibold rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm touch-manipulation
            ${book && borrowedBookIds.includes(book.id)
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : book && reservedBookIds.includes(book.id)
                ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-md'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl active:scale-95'}
            disabled:opacity-70`}
        >
          {#if book && borrowedBookIds.includes(book.id)}
            ✓ Already Borrowed
          {:else if book && reservedBookIds.includes(book.id)}
            ✓ Reserved
          {:else}
            {actionLoading ? 'Processing...' : 'Reserve This Book'}
          {/if}
        </button>
        <button
          on:click={handleClose}
          class="px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg sm:rounded-xl hover:bg-white hover:border-slate-400 transition-all text-xs sm:text-sm touch-manipulation active:scale-95"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }

  @media (min-width: 640px) {
    @keyframes slideUp {
      from {
        transform: translateY(20px) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    /* No slideDown for desktop */
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }

  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }

  .animate-slideDown {
    animation: slideDown 0.3s ease-in forwards;
  }

  /* Smooth scrolling for modal content */
  .overflow-y-auto {
    -webkit-overflow-scrolling: touch;
  }
</style>