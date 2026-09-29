<script lang="ts">
  import CatalogItemModal from './CatalogItemModal.svelte';

  export let journal: any;
  export let reservedJournalIds: number[] = [];
  export let borrowedJournalIds: number[] = [];
  export let actionLoading: boolean = false;
  export let onClose: () => void;
  export let onReserve: (journal: any) => void;
  export let onCancelReserve: ((journal: any) => void) | undefined = undefined;
  export let itemType: string = 'journal';

  $: isReserved = Boolean(journal && reservedJournalIds.includes(journal.id));
  $: isBorrowed = Boolean(journal && borrowedJournalIds.includes(journal.id));
  $: details = journal
    ? [
        { label: 'Language', value: journal.language },
        { label: 'Publisher', value: journal.publisher },
        { label: 'ISSN', value: journal.issn, mono: true },
        { label: 'Volume', value: journal.volume },
        { label: 'Issue', value: journal.issueNumber },
        { label: 'Pages', value: journal.pages }
      ]
    : [];
</script>

{#if journal}
  <CatalogItemModal
    title={journal.title}
    {itemType}
    catalogId={journal.journalId}
    contributor={journal.author}
    contributorLabel="by"
    category={journal.category}
    year={journal.publishedDate}
    coverUrl={journal.coverImage}
    accent="#5a3d8f"
    {details}
    summaryLabel="About this {itemType}"
    summary={journal.description}
    availableCopies={journal.availableCopies ?? 0}
    totalCopies={journal.totalCopies ?? 0}
    {isReserved}
    {isBorrowed}
    {actionLoading}
    {onClose}
    onReserve={() => onReserve(journal)}
    onCancelReserve={onCancelReserve ? () => onCancelReserve?.(journal) : undefined}
  />
{/if}