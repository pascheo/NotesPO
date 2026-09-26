<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjetsStore } from '../stores/projets';
import { EQUIPES, type Equipe } from '../types';
import TagEquipe from '../components/TagEquipe.vue';
import BarreProgression from '../components/BarreProgression.vue';
import ModalNouveauProjet from '../components/ModalNouveauProjet.vue';
import { classeEtat, formatDate, joursRestants } from '../utils/format';

const store = useProjetsStore();
const router = useRouter();

const filtreEquipe = ref<Equipe | ''>('');
const tri = ref<'deadline' | 'charge' | 'progression'>('deadline');
const modalOuvert = ref(false);

async function charger() {
  await Promise.all([
    store.charger({ equipe: filtreEquipe.value || undefined, sort: tri.value }),
    store.chargerStats(),
  ]);
}

onMounted(charger);

const stats = computed(() => store.stats);

const cartes = computed(() => [
  {
    label: 'Réalisation globale',
    valeur: stats.value ? `${stats.value.progression_globale}%` : '—',
    detail: 'Moyenne pondérée par priorité',
    couleur: 'text-blue-400',
  },
  {
    label: 'Projets en cours',
    valeur: stats.value ? String(stats.value.projets_en_cours) : '—',
    detail: `${stats.value?.total_projets ?? 0} projets actifs au total`,
    couleur: 'text-emerald-400',
  },
  {
    label: 'Actions en retard',
    valeur: stats.value ? String(stats.value.actions_en_retard) : '—',
    detail: `${stats.value?.projets_en_retard ?? 0} projets en retard`,
    couleur: 'text-red-400',
  },
  {
    label: 'Charge moyenne / équipe',
    valeur: stats.value ? `${stats.value.charge_moyenne_equipe}%` : '—',
    detail: 'Allocation moyenne des agents',
    couleur: 'text-amber-400',
  },
]);
</script>

<template>
  <div class="p-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-100">Vue Synthétique</h1>
        <p class="text-sm text-slate-500">Point hebdomadaire des projets et actions</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        @click="modalOuvert = true"
      >
        + Nouveau projet
      </button>
    </div>

    <p v-if="store.erreur" class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
      {{ store.erreur }}
    </p>

    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="carte in cartes"
        :key="carte.label"
        class="rounded-xl border border-surface-border bg-surface-raised p-5"
      >
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ carte.label }}</p>
        <p class="mt-2 text-3xl font-semibold" :class="carte.couleur">{{ carte.valeur }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ carte.detail }}</p>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="filtreEquipe" class="filtre" @change="charger">
        <option value="">Toutes les équipes</option>
        <option v-for="e in EQUIPES" :key="e" :value="e">{{ e }}</option>
      </select>
      <select v-model="tri" class="filtre" @change="charger">
        <option value="deadline">Trier par échéance</option>
        <option value="charge">Trier par charge équipe</option>
        <option value="progression">Trier par progression</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-xl border border-surface-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Projet</th>
            <th class="px-4 py-3">Équipe</th>
            <th class="px-4 py-3">Échéance</th>
            <th class="px-4 py-3">Progression</th>
            <th class="px-4 py-3">État</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-border bg-surface-card">
          <tr v-if="store.chargement">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Chargement…</td>
          </tr>
          <tr v-else-if="store.projets.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Aucun projet actif.</td>
          </tr>
          <tr
            v-for="p in store.projets"
            :key="p.id"
            class="cursor-pointer transition hover:bg-surface-raised"
            @click="router.push(`/projets/${p.id}`)"
          >
            <td class="px-4 py-3 font-medium text-slate-100">{{ p.nom }}</td>
            <td class="px-4 py-3"><TagEquipe :equipe="p.equipe" /></td>
            <td class="px-4 py-3 text-slate-400">
              {{ formatDate(p.date_limite) }}
              <span
                v-if="p.etat !== 'Terminé'"
                class="ml-1 text-xs"
                :class="joursRestants(p.date_limite) < 0 ? 'text-red-400' : 'text-slate-500'"
              >
                ({{ joursRestants(p.date_limite) < 0 ? `${Math.abs(joursRestants(p.date_limite))}j de retard` : `J-${joursRestants(p.date_limite)}` }})
              </span>
            </td>
            <td class="px-4 py-3"><BarreProgression :valeur="p.progression_global" /></td>
            <td class="px-4 py-3">
              <span class="rounded-full border px-2 py-0.5 text-xs" :class="classeEtat(p.etat)">
                {{ p.etat }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalNouveauProjet v-if="modalOuvert" @close="modalOuvert = false" @created="charger" />
  </div>
</template>

<style scoped>
.filtre {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500;
}
</style>
