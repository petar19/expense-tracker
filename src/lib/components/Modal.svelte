<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: Snippet } = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<!-- A plain conditionally-rendered overlay tied directly to `open`, rather
     than a native <dialog> driven by showModal()/close() through an effect —
     that combination is a known footgun (the dialog's own native open state
     and the reactive prop fight each other, e.g. showModal() throwing if
     called while already open from a stray re-run) and was the cause of the
     panel opening on its own and refusing to close. -->
{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="modal-content card stack" role="dialog" aria-modal="true" aria-label={title}>
      <div class="row" style="justify-content: space-between">
        <h2 style="margin:0">{title}</h2>
        <button onclick={onClose} aria-label="Close">✕</button>
      </div>
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
  }
  .modal-content {
    width: min(700px, 92vw);
    max-height: 85vh;
    overflow-y: auto;
  }
</style>
