<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let book: any;
  export let reservedBookIds: number[] = [];
  export let borrowedBookIds: number[] = [];
  export let actionLoading: boolean = false;
  export let onClose: () => void;
  export let onReserve: (book: any) => void;
  export let onCancelReserve: ((book: any) => void) | undefined;
  export let itemType: string = 'book';

  function capitalize(str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  $: isReserved  = book && reservedBookIds.includes(book.id);
  $: isBorrowed  = book && borrowedBookIds.includes(book.id);
  // `book` object uses `availableCopies` field, not `copiesAvailable`.
  $: isAvailable = book?.availableCopies > 0;

  let isDesktop = typeof window !== 'undefined'
    ? window.matchMedia('(min-width: 640px)').matches
    : true;

  function updateIsDesktop() {
    isDesktop = window.matchMedia('(min-width: 640px)').matches;
  }

  let closing = false;

  function handleClose() {
    if (!isDesktop) {
      closing = true;
      setTimeout(() => { closing = false; onClose(); }, 320);
    } else {
      onClose();
    }
  }

  onMount(() => {
    document.body.classList.add('overflow-hidden');
    window.addEventListener('resize', updateIsDesktop);
  });

  onDestroy(() => {
    document.body.classList.remove('overflow-hidden');
    window.removeEventListener('resize', updateIsDesktop);
  });
</script>

{#if book}
  <!-- Backdrop -->
  <div
    class="modal-backdrop"
    on:click={handleClose}
    role="dialog"
    aria-modal="true"
    aria-label="Book details"
  >
    <!-- Sheet -->
    <div
      class="modal-sheet {closing ? 'closing' : ''}"
      on:click|stopPropagation
    >

      <!-- ── Pull handle (mobile) ── -->
      <div class="drag-handle" aria-hidden="true"></div>

      <!-- ── Cover + Title hero ── -->
      <div class="hero">
        {#if book.coverImage}
          <div class="cover-wrap">
            <img
              src={book.coverImage}
              alt="Cover of {book.title}"
              class="cover-img"
              loading="lazy"
              on:error={(e) => { (e.currentTarget as HTMLImageElement).parentElement?.classList.add('cover-error'); }}
            />
            <div class="cover-glow"></div>
          </div>
        {:else}
          <div class="cover-placeholder">
            <svg viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="52" rx="3" fill="currentColor" opacity="0.12"/>
              <rect x="7" y="10" width="26" height="2.5" rx="1.25" fill="currentColor" opacity="0.35"/>
              <rect x="7" y="16" width="20" height="2" rx="1" fill="currentColor" opacity="0.22"/>
              <rect x="7" y="21" width="23" height="2" rx="1" fill="currentColor" opacity="0.22"/>
              <rect x="7" y="33" width="14" height="2" rx="1" fill="currentColor" opacity="0.18"/>
            </svg>
          </div>
        {/if}

        <div class="hero-text">
          <!-- Status pill -->
          <span class="status-pill {isAvailable ? 'pill-available' : 'pill-unavailable'}">
            <span class="pill-dot"></span>
            {isAvailable
              ? (book.availableCopies > 5 ? 'Available' : `${book.availableCopies} left`)
              : 'Unavailable'}
          </span>

          <h2 class="book-title">{book.title}</h2>
          <p class="book-author">by <em>{book.author}</em></p>

          {#if book.category}
            <span class="category-tag">{book.category}</span>
          {/if}
        </div>
      </div>

      <!-- ── Divider ── -->
      <div class="divider"></div>

      <!-- ── Scrollable body ── -->
      <div class="modal-body">

        <!-- Metadata grid -->
        <dl class="meta-grid">
          <div class="meta-item">
            <dt>ID</dt>
            <dd class="mono">{book.bookId}</dd>
          </div>
          <div class="meta-item">
            <dt>Published</dt>
            <dd>{book.publishedYear ?? '—'}</dd>
          </div>
          {#if book.language}
            <div class="meta-item">
              <dt>Language</dt>
              <dd>{book.language}</dd>
            </div>
          {/if}
          {#if book.publisher}
            <div class="meta-item">
              <dt>Publisher</dt>
              <dd>{book.publisher}</dd>
            </div>
          {/if}
          {#if book.edition}
            <div class="meta-item">
              <dt>Edition</dt>
              <dd>{book.edition}</dd>
            </div>
          {/if}
          {#if book.isbn}
            <div class="meta-item">
              <dt>ISBN</dt>
              <dd class="mono">{book.isbn}</dd>
            </div>
          {/if}
          {#if book.pages}
            <div class="meta-item">
              <dt>Pages</dt>
              <dd>{book.pages}</dd>
            </div>
          {/if}
        </dl>

        <!-- Description -->
        <div class="description-block">
          <h3 class="section-label">About this {capitalize(itemType)}</h3>
          {#if book.description}
            <p class="description-text">{book.description}</p>
          {:else}
            <p class="description-text text-muted">No description available.</p>
          {/if}
        </div>

      </div>

      <!-- ── Footer CTA ── -->
      <div class="modal-footer">
        {#if isBorrowed}
          <button class="btn-cta btn-borrowed" disabled>
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-5.121-5.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Already Borrowed
          </button>
        {:else if isReserved}
          <div class="footer-row">
            {#if onCancelReserve}
              <button
                class="btn-cancel"
                on:click={() => onCancelReserve && onCancelReserve(book)}
              >Cancel</button>
            {/if}
            <button class="btn-cta btn-reserved" disabled>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-5.121-5.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Reserved
            </button>
          </div>
        {:else}
          <button
            class="btn-cta btn-reserve {!isAvailable ? 'btn-dim' : ''}"
            on:click={() => onReserve(book)}
            disabled={actionLoading || !isAvailable}
          >
            {#if actionLoading}
              <span class="spinner"></span>
              Processing…
            {:else}
              Reserve {capitalize(itemType)}
            {/if}
          </button>
        {/if}

        <button class="btn-ghost" on:click={handleClose}>Dismiss</button>
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── Google Font import ── */
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  /* ── Tokens ── */
  :root {
    --ink:     #1a1a2e;
    --ink-2:   #4a4a6a;
    --ink-3:   #8888a8;
    --paper:   #fafaf8;
    --surface: #ffffff;
    --line:    rgba(26,26,46,.08);
    --green:   #1a6b45;
    --green-2: #e6f4ed;
    --amber:   #b45309;
    --amber-2: #fef3c7;
    --radius:  18px;
    --shadow:  0 32px 80px rgba(26,26,46,.18), 0 8px 24px rgba(26,26,46,.1);
  }

  /* ── Backdrop ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 20, .55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    animation: fadeIn .22s ease;
  }

  @media (min-width: 640px) {
    .modal-backdrop { align-items: center; padding: 1.5rem; }
  }

  /* ── Sheet ── */
  .modal-sheet {
    background: var(--surface);
    border-radius: var(--radius) var(--radius) 0 0;
    width: 100%;
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow);
    overflow: hidden;
    animation: slideUp .32s cubic-bezier(.22,.68,0,1.1);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .modal-sheet.closing {
    animation: slideDown .28s cubic-bezier(.4,0,1,1) forwards;
  }

  @media (min-width: 640px) {
    .modal-sheet {
      border-radius: var(--radius);
      max-width: 520px;
      max-height: 88vh;
      animation: popIn .28s cubic-bezier(.22,.68,0,1.1);
    }
  }

  /* ── Drag handle ── */
  .drag-handle {
    width: 38px; height: 4px;
    background: var(--line);
    border-radius: 99px;
    margin: 12px auto 0;
    flex-shrink: 0;
  }

  @media (min-width: 640px) { .drag-handle { display: none; } }

  /* ── Hero section ── */
  .hero {
    display: flex;
    gap: 1.125rem;
    padding: 1.25rem 1.375rem 1rem;
    flex-shrink: 0;
    align-items: flex-start;
  }

  /* Cover */
  .cover-wrap {
    position: relative;
    flex-shrink: 0;
    width: 80px;
  }

  .cover-img {
    width: 80px;
    height: 112px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 4px 6px 20px rgba(26,26,46,.22);
    display: block;
  }

  .cover-glow {
    position: absolute;
    inset: 0;
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.15);
    pointer-events: none;
  }

  .cover-placeholder {
    width: 80px;
    height: 112px;
    background: linear-gradient(145deg, #e8e8f0, #d8d8ea);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-2);
    flex-shrink: 0;
  }

  .cover-placeholder svg { width: 40px; height: 52px; }

  /* Hero text */
  .hero-text {
    flex: 1;
    min-width: 0;
    padding-top: 2px;
    display: flex;
    flex-direction: column;
    gap: .4rem;
  }

  /* Status pill */
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: 3px 10px 3px 7px;
    border-radius: 99px;
    width: fit-content;
  }

  .pill-available {
    background: var(--green-2);
    color: var(--green);
  }

  .pill-unavailable {
    background: #f1f1f3;
    color: var(--ink-3);
  }

  .pill-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .book-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.3;
    margin: 0;
    /* Clamp to 3 lines */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-author {
    font-size: .82rem;
    color: var(--ink-2);
    margin: 0;
    font-weight: 300;
  }

  .book-author em {
    font-style: italic;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: .88rem;
  }

  .category-tag {
    display: inline-block;
    font-size: .72rem;
    font-weight: 500;
    letter-spacing: .03em;
    color: #7c4f1a;
    background: #fef3e2;
    border: 1px solid #f5d08a;
    border-radius: 6px;
    padding: 2px 8px;
    width: fit-content;
    margin-top: 2px;
  }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--line);
    margin: 0 1.375rem;
    flex-shrink: 0;
  }

  /* ── Scrollable body ── */
  .modal-body {
    overflow-y: auto;
    padding: 1rem 1.375rem;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    -webkit-overflow-scrolling: touch;
  }

  .modal-body::-webkit-scrollbar { width: 4px; }
  .modal-body::-webkit-scrollbar-track { background: transparent; }
  .modal-body::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }

  /* ── Meta grid ── */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .625rem .5rem;
    margin: 0;
  }

  .meta-item {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: .625rem .75rem;
  }

  .meta-item dt {
    font-size: .67rem;
    font-weight: 500;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: .2rem;
  }

  .meta-item dd {
    font-size: .85rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0;
    word-break: break-word;
  }

  .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: .78rem; }

  /* ── Description ── */
  .description-block {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }

  .section-label {
    font-size: .7rem;
    font-weight: 500;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin: 0;
  }

  .description-text {
    font-size: .85rem;
    line-height: 1.65;
    color: var(--ink-2);
    margin: 0;
  }

  /* ── Footer ── */
  .modal-footer {
    flex-shrink: 0;
    padding: .875rem 1.375rem calc(.875rem + env(safe-area-inset-bottom, 12px));
    border-top: 1px solid var(--line);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }

  @media (min-width: 640px) {
    .modal-footer { padding: 1rem 1.375rem; }
  }

  .footer-row {
    display: flex;
    gap: .625rem;
  }

  /* CTA button */
  .btn-cta {
    width: 100%;
    padding: .875rem;
    border-radius: 12px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: .92rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    transition: transform .15s, box-shadow .15s, opacity .15s;
  }

  .btn-cta svg { width: 16px; height: 16px; flex-shrink: 0; }

  .btn-reserve {
    background: var(--ink);
    color: #fff;
    box-shadow: 0 4px 16px rgba(26,26,46,.22);
  }

  .btn-reserve:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(26,26,46,.28);
  }

  .btn-reserve:not(:disabled):active { transform: scale(.97); }

  .btn-reserved {
    background: var(--green-2);
    color: var(--green);
  }

  .btn-borrowed {
    background: #f1f1f3;
    color: var(--ink-3);
  }

  .btn-dim { opacity: .5; cursor: not-allowed; }

  /* Ghost + Cancel */
  .btn-ghost {
    background: transparent;
    border: none;
    color: var(--ink-3);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: .82rem;
    font-weight: 400;
    cursor: pointer;
    padding: .375rem;
    text-align: center;
    transition: color .15s;
  }

  .btn-ghost:hover { color: var(--ink); }

  .btn-cancel {
    flex: 0 0 auto;
    padding: .875rem 1rem;
    border-radius: 12px;
    border: 1.5px solid #fecaca;
    background: #fff5f5;
    color: #dc2626;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: .88rem;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s;
  }

  .btn-cancel:hover { background: #fee2e2; }

  /* Spinner */
  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Animations ── */
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes slideDown {
    from { transform: translateY(0);    opacity: 1; }
    to   { transform: translateY(100%); opacity: 0; }
  }

  @keyframes popIn {
    from { transform: scale(.94) translateY(12px); opacity: 0; }
    to   { transform: scale(1)   translateY(0);    opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>