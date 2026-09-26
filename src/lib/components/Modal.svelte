<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: Snippet } = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    else if (!open && dialogEl.open) dialogEl.close();
  });
</script>

<dialog bind:this={dialogEl} onclose={onClose} class="stack">
  <div class="row" style="justify-content: space-between">
    <h2 style="margin:0">{title}</h2>
    <button onclick={onClose} aria-label="Close">✕</button>
  </div>
  {@render children()}
</dialog>

<style>
  dialog {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    width: min(700px, 92vw);
    max-height: 85vh;
    overflow-y: auto;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
