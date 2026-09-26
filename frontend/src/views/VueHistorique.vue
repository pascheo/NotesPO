<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { historiqueApi } from '../api/client';
import type { HistoriqueEntry } from '../types';

const router = useRouter();
const entrees = ref<HistoriqueEntry[]>([]);
const chargement = ref(true);
const filtreType = ref<'' | 'projet' | 'action' | 'agent' | 'tache'>('');
const filtreAction = ref<'' | 'create' | 'update' | 'delete' | 'archive'>('');

async function charger() {
  chargement.value = true;
  entrees.value = await historiqueApi.liste({
    entite_type: filtreType.value || undefined,
    limit: 300,
  });
  chargement.value = false;
}

onMounted(charger);

const entreesFiltrees = computed(() =>
  filtreAction.value ? entrees.value.filter((e) => e.action === filtreAction.value) : entrees.value
);

function classeAction(action: string) {
  switch (action) {
    case 'create':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'update':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'archive':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'delete':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    default:
      return 'bg-slate-600/30 text-slate-300 border-slate-500/40';
  }
}

function formatChamp(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (typeof valeur === 'object') return JSON.stringify(valeur);
  return String(valeur);
}

function formatDateHeure(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <div class="p-8">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-slate-100">Historique</h1>
      <p class="text-sm text-slate-500">Journal des modifications (audit trail)</p>
    </div>

    <div class="mb-4 flex flex-wrap gap-3">
      <select v-model="filtreType" class="filtre" @change="charger">
        <option value="">Tous les éléments</option>
        <option value="projet">Projets</option>
        <option value="action">Actions / sous-tâches</option>
        <option value="agent">Agents</option>
        <option value="tache">Tâches</option>
      </select>
      <select v-model="filtreAction" class="filtre">
        <option value="">Toutes les opérations</option>
        <option value="create">Création</option>
        <option value="update">Mise à jour</option>
        <option value="archive">Archivage</option>
        <option value="delete">Suppression</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-xl border border-surface-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Opération</th>
            <th class="px-4 py-3">Élément</th>
            <th class="px-4 py-3">Détails</th>
            <th class="px-4 py-3">Auteur</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-border bg-surface-card">
          <tr v-if="chargement">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Chargement…</td>
          </tr>
          <tr v-else-if="entreesFiltrees.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Aucun événement trouvé.</td>
          </tr>
          <tr v-for="e in entreesFiltrees" :key="e.id" class="align-top hover:bg-surface-raised">
            <td class="whitespace-nowrap px-4 py-3 text-slate-400">{{ formatDateHeure(e.timestamp) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-full border px-2 py-0.5 text-xs" :class="classeAction(e.action)">
                {{ e.action_label }}
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                v-if="e.projet_id"
                class="text-left text-slate-200 hover:text-blue-400 hover:underline"
                @click="router.push(`/projets/${e.projet_id}`)"
              >
                {{ e.libelle }}
              </button>
              <span v-else class="text-slate-200">{{ e.libelle }}</span>
              <p v-if="e.entite_type === 'action' && e.projet_nom" class="text-xs text-slate-500">
                Projet : {{ e.projet_nom }}
              </p>
            </td>
            <td class="px-4 py-3 text-slate-400">
              <ul v-if="e.champs_modifies" class="space-y-0.5">
                <li v-for="(valeurs, champ) in e.champs_modifies" :key="champ">
                  <span class="text-slate-500">{{ champ }}</span> :
                  <template v-if="Array.isArray(valeurs)">
                    <span class="text-slate-500 line-through">{{ formatChamp(valeurs[0]) }}</span>
                    →
                    <span class="text-slate-300">{{ formatChamp(valeurs[1]) }}</span>
                  </template>
                  <span v-else class="text-slate-300">{{ formatChamp(valeurs) }}</span>
                </li>
              </ul>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3 text-slate-400">{{ e.auteur }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filtre {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500;
}
</style>
