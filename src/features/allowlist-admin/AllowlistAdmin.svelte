<script lang="ts">
  import { onMount } from 'svelte';
  import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
  } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { currentUser } from '../../lib/stores/auth';
  import { t } from '../../lib/i18n';

  interface Entry {
    email: string;
    role: 'admin' | 'user';
  }

  let entries = $state<Entry[]>([]);
  let newEmail = $state('');
  let newRole = $state<'admin' | 'user'>('user');
  let error = $state('');

  onMount(() => {
    const unsub = onSnapshot(collection(db, 'allowedUsers'), (snap) => {
      entries = snap.docs
        .map((d) => ({ email: d.id, role: d.data().role as 'admin' | 'user' }))
        .sort((a, b) => a.email.localeCompare(b.email));
    });
    return unsub;
  });

  async function addEntry() {
    error = '';
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      error = $t('allowlist.invalidEmail');
      return;
    }
    try {
      await setDoc(doc(db, 'allowedUsers', email), { role: newRole });
      newEmail = '';
      newRole = 'user';
    } catch (e) {
      error = e instanceof Error ? e.message : $t('allowlist.addFailed');
    }
  }

  async function removeEntry(email: string) {
    if (email === $currentUser?.email?.toLowerCase()) {
      error = $t('allowlist.cantRemoveSelf');
      return;
    }
    if (!confirm($t('allowlist.removeConfirm', { email }))) return;
    try {
      await deleteDoc(doc(db, 'allowedUsers', email));
    } catch (e) {
      error = e instanceof Error ? e.message : $t('allowlist.removeFailed');
    }
  }
</script>

<div class="page stack">
  <h2>{$t('allowlist.title')}</h2>
  <p class="muted">{$t('allowlist.description')}</p>

  <div class="card stack">
    <form class="row" onsubmit={(e) => { e.preventDefault(); addEntry(); }}>
      <input
        type="email"
        placeholder={$t('allowlist.emailPlaceholder')}
        bind:value={newEmail}
      />
      <select bind:value={newRole}>
        <option value="user">{$t('allowlist.roleUser')}</option>
        <option value="admin">{$t('allowlist.roleAdmin')}</option>
      </select>
      <button class="primary" type="submit">{$t('allowlist.add')}</button>
    </form>
    {#if error}
      <p class="muted" style="color: var(--danger)">{error}</p>
    {/if}
  </div>

  <div class="stack">
    {#each entries as entry (entry.email)}
      <div class="card row" style="justify-content: space-between">
        <div>
          <strong>{entry.email}</strong>
          <span class="muted">— {entry.role === 'admin' ? $t('allowlist.roleAdmin') : $t('allowlist.roleUser')}</span>
        </div>
        <button class="danger" onclick={() => removeEntry(entry.email)}>
          {$t('allowlist.remove')}
        </button>
      </div>
    {:else}
      <p class="muted">{$t('allowlist.empty')}</p>
    {/each}
  </div>
</div>
