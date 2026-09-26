<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjetsStore } from '../stores/projets';
import { agentsApi, projetsApi } from '../api/client';
import { EQUIPES, type Agent, type Equipe } from '../types';
import TagEquipe from '../components/TagEquipe.vue';
import BarreProgression from '../components/BarreProgression.vue';
import ModalNouveauProjet from '../components/ModalNouveauProjet.vue';
import TachesPanel from '../components/TachesPanel.vue';
import { classeEtat, formatDate, joursRestants } from '../utils/format';

const PASCAL = 'Pascal Olivier';

const store = useProjetsStore();
const router = useRouter();

const filtreEquipe = ref<Equipe | ''>('');
const modalOuvert = ref(false);
const agents = ref<Agent[]>([]);

async function chargerProjets() {
  await store.charger({ equipe: filtreEquipe.value || undefined, sort: 'deadline' });
}

onMounted(async () => {
  await Promise.all([chargerProjets(), (async () => (agents.value = await agentsApi.liste()))()]);
});

// --- Ajout rapide d'une action à un projet existant ---
const nouvelleAction = reactive({ projet_id: '', description: '', assignee: PASCAL });
const ajoutActionEnCours = ref(false);
const ajoutActionErreur = ref<string | null>(null);
const ajoutActionSucces = ref(false);

async function ajouterAction() {
  ajoutActionErreur.value = null;
  ajoutActionSucces.value = false;
  if (!nouvelleAction.projet_id || !nouvelleAction.description.trim()) {
    ajoutActionErreur.value = 'Choisissez un projet et décrivez l\'action.';
    return;
  }
  ajoutActionEnCours.value = true;
  try {
    await projetsApi.ajouterAction(Number(nouvelleAction.projet_id), {
      description: nouvelleAction.description.trim(),
      assignee: nouvelleAction.assignee,
    });
    nouvelleAction.description = '';
    ajoutActionSucces.value = true;
    await chargerProjets();
  } catch (e) {
    ajoutActionErreur.value = "Impossible d'ajouter cette action.";
  } finally {
    ajoutActionEnCours.value = false;
  }
}

const projetsActifs = computed(() => store.projets.filter((p) => p.etat !== 'Terminé'));
</script>

<template>
  <div class="p-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-100">Revue Fares</h1>
        <p class="text-sm text-slate-500">Préparation et suivi du point hebdomadaire Pascal Olivier / Fares Tabet</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        @click="modalOuvert = true"
      >
        + Nouveau projet
      </button>
    </div>

    <!-- Projets en cours à questionner -->
    <section class="mb-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Projets en cours</h2>
        <select v-model="filtreEquipe" class="filtre" @change="chargerProjets">
          <option value="">Toutes les équipes</option>
          <option v-for="e in EQUIPES" :key="e" :value="e">{{ e }}</option>
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
            <tr v-else-if="projetsActifs.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">Aucun projet en cours.</td>
            </tr>
            <tr
              v-for="p in projetsActifs"
              :key="p.id"
              class="cursor-pointer transition hover:bg-surface-raised"
              @click="router.push(`/projets/${p.id}`)"
            >
              <td class="px-4 py-3 font-medium text-slate-100">{{ p.nom }}</td>
              <td class="px-4 py-3"><TagEquipe :equipe="p.equipe" /></td>
              <td class="px-4 py-3 text-slate-400">
                {{ formatDate(p.date_limite) }}
                <span
                  class="ml-1 text-xs"
                  :class="joursRestants(p.date_limite) < 0 ? 'text-red-400' : 'text-slate-500'"
                >
                  ({{ joursRestants(p.date_limite) < 0 ? `${Math.abs(joursRestants(p.date_limite))}j de retard` : `J-${joursRestants(p.date_limite)}` }})
                </span>
              </td>
              <td class="px-4 py-3"><BarreProgression :valeur="p.progression_global" /></td>
              <td class="px-4 py-3">
                <span class="rounded-full border px-2 py-0.5 text-xs" :class="classeEtat(p.etat)">{{ p.etat }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Ajout rapide d'une action à un projet existant -->
    <details class="group mb-8 rounded-xl border border-surface-border bg-surface-raised">
      <summary
        class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400 marker:content-none"
      >
        <span>+ Ajouter une action à un projet existant</span>
        <span class="text-slate-500 transition group-open:rotate-180">⌄</span>
      </summary>
      <div class="border-t border-surface-border p-4">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="ajouterAction">
          <div class="min-w-[220px]">
            <label class="mb-1 block text-xs text-slate-500">Projet *</label>
            <select v-model="nouvelleAction.projet_id" class="input w-full">
              <option value="">Choisir un projet…</option>
              <option v-for="p in store.projets" :key="p.id" :value="p.id">{{ p.nom }}</option>
            </select>
          </div>
          <div class="flex-1 min-w-[220px]">
            <label class="mb-1 block text-xs text-slate-500">Description de l'action *</label>
            <input v-model="nouvelleAction.description" type="text" class="input w-full" placeholder="Ex : Relancer le prestataire" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-500">Assignée à</label>
            <select v-model="nouvelleAction.assignee" class="input w-48">
              <option :value="PASCAL">{{ PASCAL }}</option>
              <option v-for="a in agents.filter((ag) => ag.nom !== PASCAL)" :key="a.id" :value="a.nom">
                {{ a.nom }}
              </option>
            </select>
          </div>
          <button type="submit" class="btn-primary" :disabled="ajoutActionEnCours">
            {{ ajoutActionEnCours ? 'Ajout…' : '+ Ajouter l\'action' }}
          </button>
        </form>
        <p v-if="ajoutActionErreur" class="mt-2 text-xs text-red-400">{{ ajoutActionErreur }}</p>
        <p v-if="ajoutActionSucces" class="mt-2 text-xs text-emerald-400">Action ajoutée avec succès.</p>
      </div>
    </details>

    <!-- Vrac de micro-tâches -->
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Vrac / micro-sujets (vérifier ceci, appeler untel…)
      </h2>
      <TachesPanel compact />
    </section>

    <ModalNouveauProjet
      v-if="modalOuvert"
      :created-by-default="PASCAL"
      :responsable-defaut="PASCAL"
      @close="modalOuvert = false"
      @created="chargerProjets"
    />
  </div>
</template>

<style scoped>
.filtre {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500;
}
.input {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500;
}
.btn-primary {
  @apply rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50;
}
</style>
