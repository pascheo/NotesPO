<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { agentsApi, tachesApi } from '../api/client';
import { ETATS, type Agent, type Etat, type Tache } from '../types';
import { classeEtat, formatDate, joursRestants } from '../utils/format';

const props = defineProps<{ compact?: boolean }>();

const afficherNotes = ref(!props.compact);
const afficherFiltres = ref(!props.compact);

const taches = ref<Tache[]>([]);
const agents = ref<Agent[]>([]);
const chargement = ref(true);
const erreur = ref<string | null>(null);

const filtreAssignee = ref('');
const filtreEtat = ref<Etat | ''>('');
const masquerTerminees = ref(true);

const nouvelleTache = reactive({
  description: '',
  assignee: '',
  notes: '',
  date_prevue_fin: '',
});
const creationEnCours = ref(false);

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    const [t, a] = await Promise.all([
      tachesApi.liste({
        assignee: filtreAssignee.value || undefined,
        etat: filtreEtat.value || undefined,
      }),
      agentsApi.liste(),
    ]);
    taches.value = t;
    agents.value = a;
  } catch (e) {
    erreur.value = 'Impossible de charger les tâches.';
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function creerTache() {
  if (!nouvelleTache.description.trim()) return;
  creationEnCours.value = true;
  erreur.value = null;
  try {
    await tachesApi.creer({
      description: nouvelleTache.description.trim(),
      assignee: nouvelleTache.assignee,
      notes: nouvelleTache.notes,
      date_prevue_fin: nouvelleTache.date_prevue_fin || null,
    });
    nouvelleTache.description = '';
    nouvelleTache.notes = '';
    nouvelleTache.date_prevue_fin = '';
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || 'Impossible de créer la tâche.';
  } finally {
    creationEnCours.value = false;
  }
}

async function majTache(tache: Tache, patch: Partial<Tache>) {
  erreur.value = null;
  try {
    await tachesApi.maj(tache.id, patch);
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || 'Impossible de mettre à jour la tâche.';
  }
}

async function supprimerTache(tache: Tache) {
  if (!confirm(`Supprimer la tâche "${tache.description}" ?`)) return;
  try {
    await tachesApi.supprimer(tache.id);
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || 'Impossible de supprimer la tâche.';
  }
}

const tachesAffichees = computed(() =>
  masquerTerminees.value ? taches.value.filter((t) => t.etat !== 'Terminé') : taches.value
);

const nbColonnes = computed(() => (props.compact ? 5 : 7));

defineExpose({ charger });
</script>

<template>
  <div>
    <p v-if="erreur" class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
      {{ erreur }}
    </p>

    <div class="mb-4 rounded-xl border border-surface-border bg-surface-raised p-4">
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="creerTache">
        <div class="flex-1 min-w-[220px]">
          <label class="mb-1 block text-xs text-slate-500">Sujet *</label>
          <input
            v-model="nouvelleTache.description"
            type="text"
            placeholder="Vérifier ceci, appeler Untel…"
            class="input w-full"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">Assigné à</label>
          <select v-model="nouvelleTache.assignee" class="input w-44">
            <option value="">Non assigné</option>
            <option v-for="a in agents" :key="a.id" :value="a.nom">{{ a.nom }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">Échéance prévue</label>
          <input v-model="nouvelleTache.date_prevue_fin" type="date" class="input w-40" />
        </div>
        <button type="submit" class="btn-primary" :disabled="creationEnCours">
          {{ creationEnCours ? 'Ajout…' : '+ Ajouter' }}
        </button>
      </form>
      <button
        v-if="!afficherNotes"
        type="button"
        class="mt-2 text-xs text-blue-400 hover:underline"
        @click="afficherNotes = true"
      >
        + Ajouter une note
      </button>
      <div v-else class="mt-2">
        <input
          v-model="nouvelleTache.notes"
          type="text"
          placeholder="Notes libres (optionnel)"
          class="input w-full"
        />
      </div>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <button
        v-if="!afficherFiltres"
        type="button"
        class="text-xs text-blue-400 hover:underline"
        @click="afficherFiltres = true"
      >
        Filtrer…
      </button>
      <template v-else>
        <select v-model="filtreAssignee" class="filtre" @change="charger">
          <option value="">Tous les assignés</option>
          <option v-for="a in agents" :key="a.id" :value="a.nom">{{ a.nom }}</option>
        </select>
        <select v-model="filtreEtat" class="filtre" @change="charger">
          <option value="">Tous les états</option>
          <option v-for="e in ETATS.filter((e) => e !== 'En retard')" :key="e" :value="e">{{ e }}</option>
        </select>
      </template>
      <label class="flex items-center gap-2 text-sm text-slate-400">
        <input type="checkbox" v-model="masquerTerminees" class="accent-blue-500" />
        Masquer les terminées
      </label>
    </div>

    <div class="overflow-hidden rounded-xl border border-surface-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Sujet</th>
            <th class="px-4 py-3">Assigné à</th>
            <th v-if="!props.compact" class="px-4 py-3">Notes</th>
            <th v-if="!props.compact" class="px-4 py-3">Ouverture</th>
            <th class="px-4 py-3">Échéance</th>
            <th class="px-4 py-3">État</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-border bg-surface-card">
          <tr v-if="chargement">
            <td :colspan="nbColonnes" class="px-4 py-6 text-center text-slate-500">Chargement…</td>
          </tr>
          <tr v-else-if="tachesAffichees.length === 0">
            <td :colspan="nbColonnes" class="px-4 py-6 text-center text-slate-500">Aucune tâche.</td>
          </tr>
          <tr v-for="t in tachesAffichees" :key="t.id" :class="{ 'opacity-50': t.etat === 'Terminé' }">
            <td class="px-4 py-3">
              <input
                type="text"
                class="input-inline"
                :value="t.description"
                @change="majTache(t, { description: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-4 py-3">
              <select
                class="input-inline"
                :value="t.assignee"
                @change="majTache(t, { assignee: ($event.target as HTMLSelectElement).value })"
              >
                <option value="">Non assigné</option>
                <option v-for="a in agents" :key="a.id" :value="a.nom">{{ a.nom }}</option>
              </select>
            </td>
            <td v-if="!props.compact" class="px-4 py-3 max-w-xs">
              <input
                type="text"
                class="input-inline"
                placeholder="—"
                :value="t.notes"
                @change="majTache(t, { notes: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td v-if="!props.compact" class="px-4 py-3 whitespace-nowrap text-slate-400">
              {{ formatDate(t.date_ouverture) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <input
                type="date"
                class="input-inline"
                :value="t.date_prevue_fin || ''"
                @change="majTache(t, { date_prevue_fin: ($event.target as HTMLInputElement).value || null })"
              />
              <span
                v-if="t.date_prevue_fin && t.etat !== 'Terminé' && joursRestants(t.date_prevue_fin) < 0"
                class="block text-xs text-red-400"
              >
                {{ Math.abs(joursRestants(t.date_prevue_fin)) }}j de retard
              </span>
            </td>
            <td class="px-4 py-3">
              <select
                class="input-inline"
                :value="t.etat"
                @change="majTache(t, { etat: ($event.target as HTMLSelectElement).value as Etat })"
              >
                <option v-for="e in ETATS.filter((e) => e !== 'En retard')" :key="e" :value="e">{{ e }}</option>
              </select>
            </td>
            <td class="px-4 py-3 text-right">
              <button class="text-xs text-red-400 hover:underline" @click="supprimerTache(t)">Supprimer</button>
            </td>
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
.input {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500;
}
.input-inline {
  @apply w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm text-slate-200 outline-none hover:border-surface-border focus:border-blue-500 focus:bg-surface-raised focus:px-2;
}
.btn-primary {
  @apply rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50;
}
</style>
