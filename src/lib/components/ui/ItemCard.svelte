<script lang="ts">
	import { restrictedActions, type RestrictedAction } from '$lib/stores/restrictionStore.js';

	import { FileText, X } from '@lucide/svelte';

	/**
	 * Book-cover style card for any borrowable library item
	 * (books, theses, journals...). Presentational only: it owns no data
	 * fetching, the parent passes state in and handles the callbacks.
	 */

	// Content
	export let title: string;
	export let author = '';
	export let year: number | string | null = null;
	/** Small line under the author (department, category, publisher...). */
	export let subtitle: string | null = null;
	/** Text on the cover art. Falls back to the title when omitted. */
	export let coverLabel: string | null = null;
	export let coverImageUrl: string | null = null;
	export let pdfAvailable = false;
	export let reference: string | null = null;

	// Stock
	export let availableCopies = 0;
	export let totalCopies = 0;
	/** At or below this many copies the item shows as "Limited". */
	export let lowStockThreshold = 5;
	export let showStock = true;
	export let showActions = true;
	export let allowUnavailableRequest = false;
	export let statusText: string | null = null;
	export let statusToneOverride: Tone | null = null;

	// The signed-in user's relationship to this item
	export let isReserved = false;
	export let isBorrowed = false;

	// Action state
	/** This card's request is in flight. */
	export let requesting = false;
	/** This card's cancel is in flight. */
	export let cancelling = false;
	/** Another request somewhere on the page is in flight; block new ones. */
	export let busy = false;
	export let requestLabel = 'Request copy';
	export let requestAction: RestrictedAction = 'reserve';

	// Callbacks
	export let onSelect: () => void = () => {};
	export let onRequest: () => void = () => {};
	export let onCancel: () => void = () => {};

	type Tone = 'good' | 'warn' | 'muted';

	$: unavailable = availableCopies === 0 && !isReserved && !isBorrowed;
	$: requestRestricted = $restrictedActions[requestAction];
	$: requestDisabled = busy || requestRestricted || (unavailable && !allowUnavailableRequest);
	$: stockLevel =
		availableCopies > lowStockThreshold ? 'Available' : availableCopies > 0 ? 'Limited' : 'Unavailable';
	$: statusLabel = statusText ?? (isBorrowed ? 'Borrowed' : isReserved ? 'Reserved' : stockLevel);
	$: statusTone = statusToneOverride ?? (isBorrowed || (!isReserved && stockLevel === 'Available')
		? 'good'
		: isReserved || stockLevel === 'Limited'
			? 'warn'
			: 'muted') as Tone;
	$: barTone = (availableCopies > lowStockThreshold ? 'good' : availableCopies > 0 ? 'warn' : 'muted') as Tone;
	$: fillPercent = totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0;
	$: byline = year ? `${author}${author ? ' · ' : ''}${year}` : author;
</script>

<article class="card" class:reserved={isReserved} class:borrowed={isBorrowed}>
	<div class="cover" aria-hidden="true">
		<div class="spine"></div>
		{#if coverImageUrl}<img class="cover-image" src={coverImageUrl} alt="" loading="lazy" />{/if}
		<div class="badges">
			<span class="badge tone-{statusTone}">{statusLabel}</span>
			{#if pdfAvailable}<span class="badge pdf">PDF</span>{/if}
		</div>
		{#if !coverImageUrl}
			<div class="cover-foot">
				<FileText class="cover-icon" strokeWidth={1.3} />
				<p class="cover-label">{coverLabel || title}</p>
			</div>
		{/if}
	</div>

	<div class="body">
		<h2 class="title">
			<!-- Stretched link: the whole card opens the details, without nesting buttons in buttons. -->
			<button type="button" class="hit" on:click={onSelect} aria-label="View {title}">
				<span class="clamp-2">{title}</span>
			</button>
		</h2>
		{#if byline}<p class="byline">{byline}</p>{/if}
		{#if subtitle}<p class="subtitle clamp-2">{subtitle}</p>{/if}
		{#if reference}<p class="reference">{reference}</p>{/if}

		{#if showStock}<div class="stock">
			<div
				class="track"
				role="img"
				aria-label="{availableCopies} of {totalCopies} copies available"
			>
				<div class="fill tone-{barTone}" style="width:{fillPercent}%"></div>
			</div>
			<span class="stock-count" aria-hidden="true">{availableCopies}/{totalCopies}</span>
		</div>{/if}

		{#if showActions}<div class="actions">
			{#if isBorrowed}
				<div class="pill pill-good">Borrowed</div>
			{:else if isReserved}
				<div class="pill pill-warn">Requested</div>
				<button
					type="button"
					class="icon-btn"
					on:click={onCancel}
					disabled={cancelling}
					aria-label="Cancel copy request for {title}"
				>
					{#if cancelling}<span class="spinner" aria-hidden="true"></span>{:else}<X size={12} strokeWidth={2.5} />{/if}
				</button>
			{:else}
				<button
					type="button"
					class="primary-btn"
					class:is-unavailable={unavailable && !allowUnavailableRequest}
					on:click={onRequest}
					disabled={requestDisabled}
					title={requestRestricted ? `Your account is restricted from ${requestAction === 'reserve' ? 'making reservations' : 'borrowing items'}` : undefined}
				>
					{requesting ? 'Sending...' : requestRestricted ? 'Restricted' : unavailable && !allowUnavailableRequest ? 'Unavailable' : requestLabel}
				</button>
			{/if}
		</div>{/if}
	</div>
</article>

<style>
	/* Every colour reads a custom property first, so a page can re-theme the
	   card (e.g. style="--ic-primary:#1d4ed8") without touching this file. */
	.card {
		--primary: var(--ic-primary, #0d5c29);
		--primary-light: var(--ic-primary-light, #1a7a3a);
		--primary-tint: var(--ic-primary-tint, #eff5ef);
		--primary-line: var(--ic-primary-line, #b8d4b8);
		--warn: var(--ic-warn, #b06a00);
		--warn-tint: var(--ic-warn-tint, #f5edd8);
		--warn-line: var(--ic-warn-line, #d4b87a);
		--danger: var(--ic-danger, #a83232);
		--danger-tint: var(--ic-danger-tint, #f5eaea);
		--danger-line: var(--ic-danger-line, #d4a8a8);
		--gold: var(--ic-gold, #e8b923);
		--paper: var(--ic-paper, #fdf8f0);
		--line: var(--ic-line, #d4c4a8);
		--track: var(--ic-track, #e8ded0);
		--ink: var(--ic-ink, #1a3a1a);
		--muted: var(--ic-muted, #9a7a5a);
		--muted-strong: var(--ic-muted-strong, #7a5a2a);
		--disabled-ink: var(--ic-disabled-ink, #9a8a7a);
		--neutral: var(--ic-neutral, #7a6a5a);

		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 2px solid var(--line);
		border-radius: 0.75rem;
		background: var(--paper);
		box-shadow: 0 1px 3px rgba(44, 26, 14, 0.08);
	}
	.card.reserved {
		border-color: var(--warn);
	}
	.card.borrowed {
		border-color: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.card {
			transition:
				transform 150ms ease,
				box-shadow 150ms ease;
		}
		.card:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 14px rgba(44, 26, 14, 0.12);
		}
	}

	/* Cover */
	.cover {
		position: relative;
		display: flex;
		height: 10rem;
		flex-shrink: 0;
		flex-direction: column;
		justify-content: space-between;
		overflow: hidden;
		padding: 0.75rem;
		background: linear-gradient(150deg, var(--primary), var(--primary-light));
	}
	.cover-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	@media (min-width: 640px) {
		.cover {
			height: 12rem;
		}
	}
	.spine {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.375rem;
		background: var(--gold);
		opacity: 0.85;
	}
	.badges {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.25rem;
	}
	.badge {
		border-radius: 0.375rem;
		padding: 0.25rem 0.5rem;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
		color: #fff;
	}
	.badge.tone-good {
		background: var(--primary);
		/* The cover is the same green, so give the "good" badge an edge. */
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
	}
	.badge.tone-warn {
		background: var(--warn);
	}
	.badge.tone-muted {
		background: var(--neutral);
	}
	.badge.pdf {
		border: 1px solid rgba(255, 255, 255, 0.35);
		background: rgba(0, 0, 0, 0.18);
	}
	.cover-foot {
		position: relative;
		z-index: 1;
	}
	.cover-foot :global(.cover-icon) {
		display: block;
		width: 2rem;
		height: 2rem;
		margin-bottom: 0.5rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.cover-label {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.75);
	}

	/* Body */
	.body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem 0.5rem 0.625rem;
	}
	.title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.25;
		color: var(--ink);
	}
	.hit {
		display: block;
		width: 100%;
		border: 0;
		padding: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	/* Stretches the title button over the whole card. The action row sits above it. */
	.hit::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 0.625rem;
	}
	.hit:focus-visible {
		outline: none;
	}
	.hit:focus-visible::after {
		outline: 2px solid var(--primary);
		outline-offset: -4px;
	}
	.clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.title .clamp-2 {
		min-height: 2.5em;
	}
	.byline {
		overflow: hidden;
		margin: 0;
		font-size: 11px;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted);
	}
	.subtitle {
		margin: 0;
		font-size: 10px;
		line-height: 1.35;
		color: var(--muted-strong);
	}
	.reference {
		margin: 0;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		color: var(--primary);
	}

	/* Stock bar */
	.stock {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.125rem;
	}
	.track {
		height: 0.375rem;
		flex: 1;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--track);
	}
	.fill {
		height: 100%;
		border-radius: 9999px;
	}
	.fill.tone-good {
		background: var(--primary);
	}
	.fill.tone-warn {
		background: var(--warn);
	}
	.fill.tone-muted {
		background: #c4b8a8;
	}
	.stock-count {
		font-size: 10px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	/* Actions */
	.actions {
		position: relative;
		z-index: 1;
		display: flex;
		gap: 0.25rem;
		margin-top: 0.125rem;
	}
	.primary-btn,
	.pill {
		display: flex;
		height: 2rem;
		min-width: 0;
		flex: 1;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
	}
	.primary-btn {
		border: 0;
		background: var(--primary);
		color: #f5f0e8;
		cursor: pointer;
	}
	.primary-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}
	.primary-btn:disabled {
		cursor: not-allowed;
	}
	.primary-btn.is-unavailable {
		background: var(--track);
		color: var(--disabled-ink);
	}
	.primary-btn:disabled:not(.is-unavailable) {
		opacity: 0.6;
	}
	.pill {
		border: 1px solid;
	}
	.pill-good {
		background: var(--primary-tint);
		border-color: var(--primary-line);
		color: var(--primary);
	}
	.pill-warn {
		background: var(--warn-tint);
		border-color: var(--warn-line);
		color: var(--warn);
	}
	.icon-btn {
		display: flex;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--danger-line);
		border-radius: 0.5rem;
		background: var(--danger-tint);
		color: var(--danger);
		cursor: pointer;
	}
	.icon-btn:disabled {
		cursor: wait;
	}
	.primary-btn:focus-visible,
	.icon-btn:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	.spinner {
		width: 0.75rem;
		height: 0.75rem;
		border: 1.5px solid var(--danger-line);
		border-top-color: var(--danger);
		border-radius: 9999px;
		animation: spin 700ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 1800ms;
		}
	}
</style>