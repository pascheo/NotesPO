<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjetsStore } from '../stores/projets';
import { affectationsApi } from '../api/client';
import { COULEURS_EQUIPE, EQUIPES, type ChargeAgent, type Equipe, type Projet } from '../types';
import { classeAllocation, formatDate } from '../utils/format';

const store = useProjetsStore();
const router = useRouter();

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

type Zoom = 'mois' | 'trimestre' | 'annee';
const zoom = ref<Zoom>('annee');
const annee = ref(new Date().getFullYear());

const equipesActives = reactive<Record<Equipe, boolean>>({
  Infrastructure: true,
  'Développement': true,
  'Réseau': true,
  Exploitation: true,
});

const charges = ref<ChargeAgent[]>([]);
const projetSurvole = ref<{ p: Projet; x: number; y: number } | null>(null);

onMounted(async () => {
  await store.charger({ archived: '0' });
  charges.value = await affectationsApi.charge();
});

function dateFromISO(iso: string) {
  return new Date(iso + 'T00:00:00');
}

const plage = computed(() => {
  const now = new Date();
  if (zoom.value === 'annee') {
    return { debut: new Date(annee.value, 0, 1), fin: new Date(annee.value, 11, 31) };
  }
  if (zoom.value === 'trimestre') {
    const trimestre = Math.floor(now.getMonth() / 3);
    return {
      debut: new Date(annee.value, trimestre * 3, 1),
      fin: new Date(annee.value, trimestre * 3 + 3, 0),
    };
  }
  return { debut: new Date(annee.value, now.getMonth(), 1), fin: new Date(annee.value, now.getMonth() + 1, 0) };
});

const moisAffiches = computed(() => {
  const { debut, fin } = plage.value;
  const result: { label: string; largeur: number }[] = [];
  const totalMs = fin.getTime() - debut.getTime();
  const cursor = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (cursor <= fin) {
    const finMois = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const debutSegment = cursor < debut ? debut : cursor;
    const finSegment = finMois > fin ? fin : finMois;
    const largeur = ((finSegment.getTime() - debutSegment.getTime() + 86400000) / totalMs) * 100;
    result.push({ label: `${MOIS[cursor.getMonth()]} ${cursor.getFullYear()}`, largeur });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
});

const projetsGantt = computed(() => {
  const { debut, fin } = plage.value;
  return store.projets
    .filter((p) => equipesActives[p.equipe])
    .filter((p) => p.date_debut)
    .map((p) => {
      const pDebut = dateFromISO(p.date_debut as string);
      const pFin = dateFromISO(p.date_limite);
      return { p, pDebut, pFin };
    })
    .filter(({ pDebut, pFin }) => pFin >= debut && pDebut <= fin);
});

function position(pDebut: Date, pFin: Date) {
  const { debut, fin } = plage.value;
  const totalMs = fin.getTime() - debut.getTime() + 86400000;
  const debutEff = pDebut < debut ? debut : pDebut;
  const finEff = pFin > fin ? fin : pFin;
  const left = ((debutEff.getTime() - debut.getTime()) / totalMs) * 100;
  const width = Math.max(((finEff.getTime() - debutEff.getTime() + 86400000) / totalMs) * 100, 1);
  return { left: `${left}%`, width: `${width}%` };
}

function estEnRetard(p: Projet) {
  return p.etat === 'En retard';
}

function afficherDetail(evt: MouseEvent, p: Projet) {
  projetSurvole.value = { p, x: evt.clientX, y: evt.clientY };
}
</script>

<template>
  <div class="p-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-100">Planning Gantt</h1>
        <p class="text-sm text-slate-500">Vue chronologique des projets par équipe</p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model.number="annee" class="filtre">
          <option v-for="a in [annee - 1, annee, annee + 1]" :key="a" :value="a">{{ a }}</option>
        </select>
        <select v-model="zoom" class="filtre">
          <option value="mois">Zoom : mois</option>
          <option value="trimestre">Zoom : trimestre</option>
          <option value="annee">Zoom : année</option>
        </select>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap gap-4">
      <label
        v-for="e in EQUIPES"
        :key="e"
        class="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
      >
        <input type="checkbox" v-model="equipesActives[e]" class="accent-blue-500" />
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: COULEURS_EQUIPE[e] }" />
        {{ e }}
      </label>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <!-- Gantt -->
      <div class="overflow-x-auto rounded-xl border border-surface-border bg-surface-raised">
        <div class="min-w-[900px]">
          <div class="flex border-b border-surface-border bg-surface-card text-xs text-slate-400">
            <div v-for="m in moisAffiches" :key="m.label" class="border-r border-surface-border px-2 py-2 text-center" :style="{ width: `${m.largeur}%` }">
              {{ m.label }}
            </div>
          </div>
          <div class="relative">
            <div
              v-for="({ p, pDebut, pFin }) in projetsGantt"
              :key="p.id"
              class="relative flex h-11 items-center border-b border-surface-border/60 px-0"
            >
              <div class="absolute left-0 top-0 flex h-full w-48 items-center truncate border-r border-surface-border bg-surface-raised px-3 text-xs text-slate-300 z-10">
                {{ p.nom }}
              </div>
              <div class="relative ml-48 h-6 flex-1">
                <div
                  class="absolute h-6 cursor-pointer rounded-md"
                  :style="{ ...position(pDebut, pFin), backgroundColor: COULEURS_EQUIPE[p.equipe] + '33', border: `1px solid ${COULEURS_EQUIPE[p.equipe]}` }"
                  @mousemove="afficherDetail($event, p)"
                  @mouseleave="projetSurvole = null"
                  @click="router.push(`/projets/${p.id}`)"
                >
                  <div
                    class="h-full rounded-l-md"
                    :style="{ width: `${p.progression_global}%`, backgroundColor: COULEURS_EQUIPE[p.equipe] }"
                  />
                  <div
                    v-if="estEnRetard(p)"
                    class="absolute -right-1 -top-1.5 h-3 w-3 rounded-full border-2 border-surface-raised bg-red-500"
                    title="Projet en retard"
                  />
                </div>
              </div>
            </div>
            <p v-if="projetsGantt.length === 0" class="py-10 text-center text-sm text-slate-600">
              Aucun projet sur cette période.
            </p>
          </div>
        </div>
      </div>

      <!-- Table de charge par agent -->
      <div class="rounded-xl border border-surface-border bg-surface-raised">
        <div class="border-b border-surface-border px-4 py-3">
          <h2 class="text-sm font-semibold text-slate-200">Charge par agent</h2>
        </div>
        <div class="max-h-[560px] space-y-3 overflow-y-auto p-4">
          <div
            v-for="c in charges"
            :key="c.agent"
            class="rounded-lg border border-surface-border bg-surface-card p-3"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-slate-100">{{ c.agent }}</p>
              <span class="flex items-center gap-1 text-sm font-semibold" :class="classeAllocation(c.allocation_totale).classe">
                {{ classeAllocation(c.allocation_totale).icone }} {{ c.allocation_totale }}%
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ c.equipe }} · {{ classeAllocation(c.allocation_totale).label }}</p>
            <ul class="mt-2 space-y-1">
              <li v-for="pr in c.projets" :key="pr.projet_id" class="flex justify-between text-xs text-slate-400">
                <span class="truncate">{{ pr.nom }}</span>
                <span class="ml-2 shrink-0">{{ pr.allocation }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="projetSurvole"
      class="pointer-events-none fixed z-50 w-64 rounded-lg border border-surface-border bg-surface-card p-3 text-xs shadow-xl"
      :style="{ left: `${projetSurvole.x + 16}px`, top: `${projetSurvole.y + 16}px` }"
    >
      <p class="font-semibold text-slate-100">{{ projetSurvole.p.nom }}</p>
      <p class="mt-1 text-slate-400">{{ formatDate(projetSurvole.p.date_debut) }} → {{ formatDate(projetSurvole.p.date_limite) }}</p>
      <p class="text-slate-400">Progression : {{ projetSurvole.p.progression_global }}%</p>
      <p class="text-slate-400">Responsable : {{ projetSurvole.p.responsable || '—' }}</p>
    </div>
  </div>
</template>

<style scoped>
.filtre {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500;
}
</style>
