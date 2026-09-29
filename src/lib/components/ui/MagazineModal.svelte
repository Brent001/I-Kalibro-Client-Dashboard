<script lang="ts">
  import CatalogItemModal from './CatalogItemModal.svelte';

  interface MagazineRecord {
    id: number;
    magazineId: string;
    title: string;
    publisher: string | null;
    issn: string | null;
    issueNumber: string | null;
    volume: string | null;
    publishedDate: string | null;
    language: string | null;
    categoryId: number | null;
    category: string | null;
    location: string | null;
    description: string | null;
    coverImage: string | null;
    totalCopies: number;
    availableCopies: number;
  }

  export let magazine: MagazineRecord | null;
  export let reservedMagazineIds: number[] = [];
  export let borrowedMagazineIds: number[] = [];
  export let actionLoading = false;
  export let onClose: () => void;
  export let onReserve: (magazine: MagazineRecord) => void;
  export let onCancelReserve: ((magazine: MagazineRecord) => void) | undefined = undefined;

  $: isReserved = Boolean(magazine && reservedMagazineIds.includes(magazine.id));
  $: isBorrowed = Boolean(magazine && borrowedMagazineIds.includes(magazine.id));
  $: details = magazine ? [
    { label: 'ISSN', value: magazine.issn },
    { label: 'Volume', value: magazine.volume },
    { label: 'Issue', value: magazine.issueNumber },
    { label: 'Language', value: magazine.language },
    { label: 'Location', value: magazine.location }
  ] : [];

  function coverUrl(value: string | null) {
    if (!value) return null;
    if (value.startsWith('/api/images/cover/')) return value;

    let path = value;
    if (/^https?:\/\//i.test(value)) {
      try {
        const pathname = decodeURIComponent(new URL(value).pathname).replace(/^\//, '');
        const magazineCover = pathname.match(/magazines\/covers\/.+$/);
        const genericCover = pathname.match(/covers\/.+$/);
        path = magazineCover?.[0] ?? genericCover?.[0] ?? pathname;
      } catch {
        return null;
      }
    }

    if (path.startsWith('covers/')) path = `magazines/${path}`;
    return `/api/images/cover/${encodeURIComponent(path)}`;
  }
</script>

{#if magazine}
  <CatalogItemModal
    title={magazine.title}
    itemType="magazine"
    catalogId={magazine.magazineId}
    contributor={magazine.publisher || ''}
    contributorLabel="Published by"
    category={magazine.category}
    year={magazine.publishedDate}
    coverUrl={coverUrl(magazine.coverImage)}
    accent="#a8243c"
    {details}
    summaryLabel="About this issue"
    emptySummary="No description available."
    summary={magazine.description}
    availableCopies={magazine.availableCopies}
    totalCopies={magazine.totalCopies}
    {isReserved}
    {isBorrowed}
    {actionLoading}
    {onClose}
    onReserve={() => onReserve(magazine)}
    onCancelReserve={onCancelReserve ? () => onCancelReserve?.(magazine!) : undefined}
  />
{/if}