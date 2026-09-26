<script setup lang="ts">
import RechercheGlobale from './RechercheGlobale.vue';

const liens = [
  { to: '/synthese', label: 'Vue Synthétique', icone: '📊' },
  { to: '/kanban', label: 'Kanban', icone: '🗂️' },
  { to: '/gantt', label: 'Planning Gantt', icone: '📅' },
  { to: '/historique', label: 'Historique', icone: '🕒' },
];
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col border-r border-surface-border bg-surface-raised">
    <div class="border-b border-surface-border px-5 py-5">
      <h1 class="text-sm font-semibold tracking-wide text-slate-100">Suivi de Projets</h1>
      <p class="mt-1 text-xs text-slate-500">DSI · Conseil Départemental 78</p>
    </div>
    <div class="border-b border-surface-border px-3 py-3">
      <RechercheGlobale />
    </div>
    <nav class="flex-1 space-y-1 px-3 py-4">
      <router-link
        v-for="lien in liens"
        :key="lien.to"
        :to="lien.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-surface-card hover:text-white"
        active-class="bg-surface-card text-white"
      >
        <span>{{ lien.icone }}</span>
        <span>{{ lien.label }}</span>
      </router-link>
    </nav>
    <div class="border-t border-surface-border px-5 py-4 text-xs text-slate-500">
      Sous-Direction Opérations
    </div>
  </aside>
</template>
