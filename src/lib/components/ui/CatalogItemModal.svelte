<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Check, X } from '@lucide/svelte';

  interface CatalogDetail {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
  }

  export let title: string;
  export let itemType: string = 'item';
  export let catalogId: string;
  export let contributor: string = '';
  /** Text shown before the contributor, e.g. "by" or "Published by". */
  export let contributorLabel: string = 'by';
  export let category: string | null = null;
  export let year: string | number | null = null;
  export let coverUrl: string | null = null;
  /** Accent colour for this collection (hero tint, cover fallback, primary button). */
  export let accent: string = '#1f4e79';
  export let details: CatalogDetail[] = [];
  export let summaryLabel: string = 'Description';
  export let summary: string | null = null;
  export let emptySummary: string = 'No description available.';
  export let availableCopies: number = 0;
  export let totalCopies: number = 0;
  export let pdfUrl: string | null = null;
  export let pdfFileName: string = 'research.pdf';
  export let isReserved: boolean = false;
  export let isBorrowed: boolean = false;
  export let actionLoading: boolean = false;
  export let onClose: () => void = () => {};
  export let onReserve: () => void = () => {};
  export let onCancelReserve: (() => void) | undefined = undefined;

  let sheetEl: HTMLElement;
  let previouslyFocused: HTMLElement | null = null;
  let desktop =
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true;
  let closing = false;
  let coverFailed = false;

  // A new cover URL gets a fresh chance to load.
  $: {
    coverUrl;
    coverFailed = false;
  }

  $: showImage = Boolean(coverUrl) && !coverFailed;
  $: initial = (title || '?').trim().charAt(0).toUpperCase();
  $: typeLabel = itemType.toLowerCase() === 'thesis'
    ? 'Research'
    : itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();

  $: isAvailable = availableCopies > 0;
  $: allOnShelf = totalCopies > 0 && availableCopies >= totalCopies;
  $: tone = !isAvailable ? 'none' : availableCopies <= 2 && !allOnShelf ? 'low' : 'ok';
  $: statusLabel = !isAvailable
    ? 'Unavailable'
    : availableCopies > 5 || allOnShelf
      ? 'Available'
      : `${availableCopies} left`;

  // One narrow "spine" per copy, filled when the copy is on the shelf.
  $: spines =
    totalCopies > 0 && totalCopies <= 12
      ? Array.from({ length: totalCopies }, (_, i) => i < availableCopies)
      : [];
  $: fillPct =
    totalCopies > 0 ? Math.min(100, Math.round((availableCopies / totalCopies) * 100)) : 0;

  $: visibleDetails = details.filter(
    (d) => d.value !== null && d.value !== undefined && d.value !== ''
  );

  function updateDesktop() {
    desktop = window.matchMedia('(min-width: 640px)').matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function close() {
    if (closing) return;
    if (!desktop && !prefersReducedMotion()) {
      closing = true;
      setTimeout(() => {
        closing = false;
        onClose();
      }, 260);
    } else {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    // Keep Tab inside the dialog while it is open.
    if (event.key !== 'Tab' || !sheetEl) return;
    const focusable = sheetEl.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === sheetEl)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.classList.add('overflow-hidden');
    window.addEventListener('resize', updateDesktop);
    sheetEl?.focus();
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('overflow-hidden');
    window.removeEventListener('resize', updateDesktop);
    previouslyFocused?.focus?.();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" role="presentation" style="--accent: {accent}" on:click={close}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="sheet"
    class:closing
    bind:this={sheetEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby="catalog-modal-title"
    tabindex="-1"
    on:click|stopPropagation
  >
    <!-- ── Hero ── -->
    <header class="hero">
      <div class="handle" aria-hidden="true"></div>

      <div class="cover">
        {#if showImage}
          <img
            src={coverUrl}
            alt="Cover of {title}"
            loading="lazy"
            on:error={() => (coverFailed = true)}
          />
        {:else}
          <div class="cover-fallback" aria-hidden="true"><span>{initial}</span></div>
        {/if}
      </div>

      <div class="hero-text">
        <span class="item-type">{typeLabel}</span>
        <span class="status tone-{tone}">
          <span class="dot"></span>
          {statusLabel}
        </span>

        <h2 id="catalog-modal-title" class="title">{title}</h2>

        {#if contributor}
          <p class="byline">{contributorLabel} <em>{contributor}</em></p>
        {/if}

        {#if category}
          <span class="category">{category}</span>
        {/if}
      </div>

      <button class="close" type="button" aria-label="Close details" on:click={close}>
        <X size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </header>

    <!-- ── Body ── -->
    <div class="body">
      {#if totalCopies > 0}
        <div class="copies tone-{tone}">
          {#if spines.length}
            <div class="spines" aria-hidden="true">
              {#each spines as onShelf}
                <span class="spine" class:on={onShelf}></span>
              {/each}
            </div>
          {:else}
            <div class="bar" aria-hidden="true"><span style="width: {fillPct}%"></span></div>
          {/if}
          <p class="copies-text">
            <strong>{availableCopies}</strong> of {totalCopies}
            {totalCopies === 1 ? 'copy' : 'copies'} available
          </p>
        </div>
      {/if}

      <dl class="record">
        <div class="row">
          <dt>Catalog ID</dt>
          <dd class="mono">{catalogId}</dd>
        </div>
        {#if year}
          <div class="row">
            <dt>Published</dt>
            <dd>{year}</dd>
          </div>
        {/if}
        {#each visibleDetails as detail (detail.label)}
          <div class="row">
            <dt>{detail.label}</dt>
            <dd class:mono={detail.mono}>{detail.value}</dd>
          </div>
        {/each}
      </dl>

      <section class="about">
        <h3>{summaryLabel}</h3>
        <p class:empty={!summary}>{summary || emptySummary}</p>
      </section>
    </div>

    <!-- ── Footer ── -->
    <footer class="footer">
      {#if isBorrowed}
        <button class="btn btn-muted" type="button" disabled>
          <Check size={16} strokeWidth={2.5} aria-hidden="true" />
          Already borrowed
        </button>
      {:else if isReserved}
        <div class="footer-row">
          {#if onCancelReserve}
            <button class="btn btn-cancel" type="button" on:click={onCancelReserve}>
              Cancel reservation
            </button>
          {/if}
          <button class="btn btn-done" type="button" disabled>
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            Reserved
          </button>
        </div>
      {:else}
        <button
          class="btn btn-primary"
          class:loading={actionLoading}
          type="button"
          on:click={onReserve}
          disabled={actionLoading || !isAvailable}
        >
          {#if actionLoading}
            <span class="spinner" aria-hidden="true"></span>
            Processing…
          {:else if !isAvailable}
            Currently unavailable
          {:else}
            Reserve {itemType}
          {/if}
        </button>
      {/if}

      {#if pdfUrl}
        <div class="footer-row">
          <a class="btn btn-outline" href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a>
          <a class="btn btn-soft" href={pdfUrl} download={pdfFileName}>Download PDF</a>
        </div>
      {/if}
    </footer>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Instrument+Sans:wght@400;500;600&display=swap');

  /* ── Tokens ── */
  .backdrop {
    --ink: #17212b;
    --ink-2: #465360;
    --ink-3: #64717e;
    --line: rgba(23, 33, 43, 0.1);
    --line-strong: rgba(23, 33, 43, 0.16);
    --surface: #ffffff;
    --accent-soft: #eef1f5;
    --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }

  @supports (color: color-mix(in srgb, red, blue)) {
    .backdrop {
      --accent-soft: color-mix(in srgb, var(--accent) 8%, white);
    }
  }

  .tone-ok { --tone: #2c8a57; }
  .tone-low { --tone: #c27803; }
  .tone-none { --tone: #9aa5ae; }

  /* ── Backdrop + sheet ── */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(12, 20, 28, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    font-family: var(--sans);
    animation: fade 0.2s ease-out;
  }

  .sheet {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 92dvh;
    overflow: hidden;
    border-radius: 20px 20px 0 0;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 -8px 40px rgba(12, 20, 28, 0.25);
    outline: none;
    animation: rise 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .sheet.closing {
    animation: fall 0.26s ease-in forwards;
  }

  @media (min-width: 640px) {
    .backdrop { align-items: center; padding: 1.5rem; }
    .sheet {
      max-width: 540px;
      max-height: 88vh;
      border-radius: 16px;
      box-shadow: 0 30px 80px rgba(12, 20, 28, 0.35);
      animation: appear 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
  }

  /* ── Hero ── */
  .hero {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    gap: 1.125rem;
    padding: 1.75rem 3.25rem 1.25rem 1.375rem;
    background: var(--accent-soft);
    border-bottom: 1px solid var(--line);
  }

  @media (min-width: 640px) {
    .hero { padding-top: 1.5rem; }
  }

  .handle {
    position: absolute;
    top: 8px;
    left: 50%;
    width: 36px;
    height: 4px;
    border-radius: 99px;
    background: rgba(23, 33, 43, 0.2);
    transform: translateX(-50%);
  }

  @media (min-width: 640px) {
    .handle { display: none; }
  }

  /* Cover, drawn as a book: rounded outer edge, creased spine */
  .cover {
    position: relative;
    flex: 0 0 auto;
    width: 88px;
    height: 124px;
    overflow: hidden;
    border-radius: 3px 7px 7px 3px;
    background: #fff;
    box-shadow:
      0 1px 2px rgba(12, 20, 28, 0.3),
      8px 12px 22px -8px rgba(12, 20, 28, 0.45);
  }

  .cover::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.22) 0,
      rgba(255, 255, 255, 0.2) 3%,
      rgba(0, 0, 0, 0.08) 6%,
      transparent 12%
    );
  }

  .cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-fallback {
    position: relative;
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    background: var(--accent);
  }

  .cover-fallback::before {
    content: '';
    position: absolute;
    inset: 9px 9px 9px 15px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 2px;
  }

  .cover-fallback span {
    padding-left: 5px;
    color: rgba(255, 255, 255, 0.95);
    font-family: var(--serif);
    font-size: 2.6rem;
    font-style: italic;
    line-height: 1;
  }

  /* Hero text */
  .hero-text {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.45rem;
    padding-top: 2px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 8px;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .item-type {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 2px 8px;
    border: 1px solid color-mix(in srgb, var(--accent) 30%, white);
    border-radius: 5px;
    background: #fff;
    color: var(--accent);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status.tone-ok { background: #ddf0e5; color: #1d6a3f; }
  .status.tone-low { background: #fbecd0; color: #8a4f00; }
  .status.tone-none { background: #e6eaed; color: #526069; }

  .dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: currentColor;
  }

  .title {
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 1.35rem;
    font-weight: 600;
    line-height: 1.22;
    text-wrap: balance;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .byline {
    margin: 0;
    color: var(--ink-3);
    font-size: 0.875rem;
  }

  .byline em {
    color: var(--ink-2);
    font-family: var(--serif);
    font-size: 1rem;
  }

  .category {
    padding: 2px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: #fff;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.7);
    color: var(--ink-2);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .close :global(svg) { width: 18px; height: 18px; }
  .close:hover { background: #fff; color: var(--ink); }

  /* ── Body ── */
  .body {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem 1.375rem 1.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .body::-webkit-scrollbar { width: 4px; }
  .body::-webkit-scrollbar-track { background: transparent; }
  .body::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 99px; }

  /* Copies on the shelf */
  .copies {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .spines {
    display: flex;
    align-items: flex-end;
    gap: 3px;
  }

  .spine {
    width: 9px;
    height: 20px;
    border-radius: 2px 3px 3px 2px;
    background: var(--line-strong);
  }

  .spine.on {
    background: var(--tone);
    box-shadow: inset 2px 0 0 rgba(255, 255, 255, 0.28);
  }

  .bar {
    width: 96px;
    height: 6px;
    flex: 0 0 auto;
    overflow: hidden;
    border-radius: 99px;
    background: var(--line-strong);
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--tone);
  }

  .copies-text {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.875rem;
  }

  .copies-text strong {
    color: var(--ink);
    font-weight: 600;
  }

  /* Catalog record */
  .record {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1.5rem;
    margin: 0;
    border-bottom: 1px solid var(--line);
  }

  .row {
    min-width: 0;
    padding: 0.65rem 0;
    border-top: 1px solid var(--line);
  }

  .row dt {
    margin-bottom: 0.15rem;
    color: var(--ink-3);
    font-size: 0.78rem;
  }

  .row dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ink);
    font-size: 0.925rem;
    font-weight: 500;
  }

  .mono {
    font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
    font-size: 0.84rem;
    letter-spacing: 0.01em;
  }

  /* About */
  .about {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .about h3 {
    margin: 0;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .about p {
    max-width: 62ch;
    margin: 0;
    color: var(--ink-2);
    font-family: var(--serif);
    font-size: 1rem;
    line-height: 1.7;
    white-space: pre-line;
  }

  .about p.empty {
    color: var(--ink-3);
    font-style: italic;
  }

  /* ── Footer ── */
  .footer {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.875rem 1.375rem calc(1rem + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  @media (min-width: 640px) {
    .footer { padding-bottom: 1rem; }
  }

  .footer-row {
    display: flex;
    gap: 0.625rem;
  }

  .btn {
    display: inline-flex;
    width: 100%;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 0;
    border-radius: 10px;
    font-family: var(--sans);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: filter 0.15s, background 0.15s;
  }

  .btn :global(svg) { width: 16px; height: 16px; flex: 0 0 auto; }

  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:not(:disabled):hover { filter: brightness(0.9); }
  .btn-primary:disabled { background: #e4e8eb; color: #5c6873; cursor: not-allowed; }
  .btn-primary.loading:disabled { background: var(--accent); color: #fff; opacity: 0.8; cursor: progress; }

  .btn-done { background: #ddf0e5; color: #1d6a3f; cursor: default; }
  .btn-muted { background: #e6eaed; color: #526069; cursor: default; }

  .btn-cancel {
    flex: 0 0 auto;
    width: auto;
    border: 1px solid #e5b5ae;
    background: #fff;
    color: #a3271c;
  }
  .btn-cancel:hover { background: #fdf2f0; }

  .btn-outline {
    flex: 1;
    min-height: 44px;
    border: 1px solid var(--accent);
    background: #fff;
    color: var(--accent);
    font-size: 0.9rem;
  }
  .btn-outline:hover { background: var(--accent-soft); }

  .btn-soft {
    flex: 1;
    min-height: 44px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.9rem;
  }
  .btn-soft:hover { filter: brightness(0.96); }

  .spinner {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Focus ── */
  .close:focus-visible,
  .btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* ── Motion ── */
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fall { to { transform: translateY(100%); opacity: 0; } }
  @keyframes appear {
    from { transform: translateY(10px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .backdrop,
    .sheet,
    .sheet.closing { animation: none; }
  }
</style>