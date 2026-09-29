<script lang="ts">
  import CatalogItemModal from './CatalogItemModal.svelte';

  export let book: any;
  export let reservedBookIds: number[] = [];
  export let borrowedBookIds: number[] = [];
  export let actionLoading: boolean = false;
  export let onClose: () => void;
  export let onReserve: (book: any) => void;
  export let onCancelReserve: ((book: any) => void) | undefined = undefined;
  export let itemType: string = 'book';

  $: isReserved = Boolean(book && reservedBookIds.includes(book.id));
  $: isBorrowed = Boolean(book && borrowedBookIds.includes(book.id));
  $: details = book
    ? [
        { label: 'Language', value: book.language },
        { label: 'Publisher', value: book.publisher },
        { label: 'Edition', value: book.edition },
        { label: 'ISBN', value: book.isbn, mono: true },
        { label: 'Pages', value: book.pages }
      ]
    : [];
</script>

{#if book}
  <CatalogItemModal
    title={book.title}
    {itemType}
    catalogId={book.bookId}
    contributor={book.author}
    contributorLabel="by"
    category={book.category}
    year={book.publishedYear}
    coverUrl={book.coverImage}
    accent="#1f4e79"
    {details}
    summaryLabel="About this {itemType}"
    summary={book.description}
    availableCopies={book.availableCopies ?? 0}
    totalCopies={book.totalCopies ?? 0}
    {isReserved}
    {isBorrowed}
    {actionLoading}
    {onClose}
    onReserve={() => onReserve(book)}
    onCancelReserve={onCancelReserve ? () => onCancelReserve?.(book) : undefined}
  />
{/if}