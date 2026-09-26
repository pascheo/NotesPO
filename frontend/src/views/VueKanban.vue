<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjetsStore } from '../stores/projets';
import { EQUIPES, ETATS, type Equipe, type Etat, type Projet } from '../types';
import TagEquipe from '../components/TagEquipe.vue';
import BarreProgression from '../components/BarreProgression.vue';
import { classePriorite, formatDate } from '../utils/format';

const store = useProjetsStore();
const router = useRouter();

const filtreEquipe = ref<Equipe | ''>('');
const glisse = ref<number | null>(null);
const survole = ref<Etat | null>(null);

onMounted(() => store.charger());

const projetsFiltres = computed(() =>
  filtreEquipe.value ? store.projets.filter((p) => p.equipe === filtreEquipe.value) : store.projets
);

const colonnes = computed(() =>
  ETATS.map((etat) => ({
    etat,
    projets: projetsFiltres.value.filter((p) => p.etat === etat),
  }))
);

function onDragStart(p: Projet) {
  glisse.value = p.id;
}
function onDrop(etat: Etat) {
  survole.value = null;
  if (glisse.value == null) return;
  store.mettreAJourEtat(glisse.value, etat);
  glisse.value = null;
}

const couleurColonne: Record<Etat, string> = {
  'À faire': 'border-slate-500/40',
  'En cours': 'border-blue-500/40',
  'En retard': 'border-red-500/40',
  'Terminé': 'border-emerald-500/40',
};
</script>

<template>
  <div class="flex h-full flex-col p-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-100">Vue Kanban</h1>
        <p class="text-sm text-slate-500">Glissez-déposez les projets pour changer leur état</p>
      </div>
      <select v-model="filtreEquipe" class="filtre">
        <option value="">Toutes les équipes</option>
        <option v-for="e in EQUIPES" :key="e" :value="e">{{ e }}</option>
      </select>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="col in colonnes"
        :key="col.etat"
        class="flex flex-col overflow-hidden rounded-xl border bg-surface-raised"
        :class="[couleurColonne[col.etat], survole === col.etat ? 'ring-2 ring-blue-500/50' : '']"
        @dragover.prevent="survole = col.etat"
        @dragleave="survole = null"
        @drop="onDrop(col.etat)"
      >
        <div class="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 class="text-sm font-semibold text-slate-200">{{ col.etat }}</h2>
          <span class="rounded-full bg-surface-card px-2 py-0.5 text-xs text-slate-400">{{ col.projets.length }}</span>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto p-3">
          <div
            v-for="p in col.projets"
            :key="p.id"
            draggable="true"
            class="cursor-grab space-y-2 rounded-lg border border-surface-border bg-surface-card p-3 shadow-sm transition hover:border-blue-500/50 active:cursor-grabbing"
            @dragstart="onDragStart(p)"
            @click="router.push(`/projets/${p.id}`)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-medium text-slate-100">{{ p.nom }}</p>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" :class="classePriorite(p.priorite)">
                {{ p.priorite }}
              </span>
            </div>
            <TagEquipe :equipe="p.equipe" />
            <p class="text-xs text-slate-500">👤 {{ p.responsable || 'Non assigné' }}</p>
            <p class="text-xs text-slate-500">Échéance : {{ formatDate(p.date_limite) }}</p>
            <BarreProgression :valeur="p.progression_global" />
          </div>
          <p v-if="col.projets.length === 0" class="pt-6 text-center text-xs text-slate-600">Aucun projet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filtre {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500;
}
</style>
