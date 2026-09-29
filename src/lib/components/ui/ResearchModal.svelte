<script lang="ts">
  import CatalogItemModal from './CatalogItemModal.svelte';

  interface ResearchRecord {
    id: number;
    thesisId: string;
    title: string;
    author: string;
    advisor: string | null;
    department: string | null;
    publicationYear: number | null;
    abstract: string | null;
    categoryId: number | null;
    category: string | null;
    location: string | null;
    pdfAvailable: boolean;
    totalCopies: number;
    availableCopies: number;
  }

  export let research: ResearchRecord | null;
  export let reservedResearchIds: number[] = [];
  export let borrowedResearchIds: number[] = [];
  export let actionLoading = false;
  export let onClose: () => void;
  export let onReserve: (research: ResearchRecord) => void;
  export let onCancelReserve: ((research: ResearchRecord) => void) | undefined = undefined;

  $: isReserved = Boolean(research && reservedResearchIds.includes(research.id));
  $: isBorrowed = Boolean(research && borrowedResearchIds.includes(research.id));
  $: details = research ? [
    { label: 'Advisor', value: research.advisor },
    { label: 'Department', value: research.department },
    { label: 'Location', value: research.location }
  ] : [];
</script>

{#if research}
  <CatalogItemModal
    title={research.title}
    itemType="print copy"
    catalogId={research.thesisId}
    contributor={research.author}
    contributorLabel="by"
    category={research.category}
    year={research.publicationYear}
    accent="#17695f"
    {details}
    summaryLabel="Abstract"
    emptySummary="No abstract available."
    summary={research.abstract}
    availableCopies={research.availableCopies}
    totalCopies={research.totalCopies}
    pdfUrl={research.pdfAvailable ? `/api/research/${research.id}/pdf` : null}
    pdfFileName={`research-${research.id}.pdf`}
    {isReserved}
    {isBorrowed}
    {actionLoading}
    {onClose}
    onReserve={() => onReserve(research)}
    onCancelReserve={onCancelReserve ? () => onCancelReserve?.(research!) : undefined}
  />
{/if}