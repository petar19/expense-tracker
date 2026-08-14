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
      error = 'Enter a valid email address';
      return;
    }
    try {
      await setDoc(doc(db, 'allowedUsers', email), { role: newRole });
      newEmail = '';
      newRole = 'user';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to add';
    }
  }

  async function removeEntry(email: string) {
    if (email === $currentUser?.email?.toLowerCase()) {
      error = "You can't remove yourself";
      return;
    }
    if (!confirm(`Remove ${email}?`)) return;
    try {
      await deleteDoc(doc(db, 'allowedUsers', email));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to remove';
    }
  }
</script>

<div class="page stack">
  <h2>Allowed users</h2>
  <p class="muted">
    Only Google accounts listed here can sign in. Admins can also manage this
    list.
  </p>

  <div class="card stack">
    <form class="row" onsubmit={(e) => { e.preventDefault(); addEntry(); }}>
      <input
        type="email"
        placeholder="name@example.com"
        bind:value={newEmail}
      />
      <select bind:value={newRole}>
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
      <button class="primary" type="submit">Add</button>
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
          <span class="muted">— {entry.role}</span>
        </div>
        <button class="danger" onclick={() => removeEntry(entry.email)}>
          Remove
        </button>
      </div>
    {:else}
      <p class="muted">No entries yet.</p>
    {/each}
  </div>
</div>
