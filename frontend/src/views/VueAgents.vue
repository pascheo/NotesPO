<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { agentsApi } from '../api/client';
import { EQUIPES, type Agent } from '../types';

const EQUIPES_SUGGEREES = [...EQUIPES, 'Direction'];

const agents = ref<Agent[]>([]);
const chargement = ref(true);
const erreur = ref<string | null>(null);
const filtreEquipe = ref<string>('');
const filtreStatut = ref<'actifs' | 'tous'>('actifs');

const nouvelAgent = reactive({ nom: '', equipe: 'Infrastructure', email: '' });
const creationEnCours = ref(false);

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    agents.value = await agentsApi.liste({
      equipe: filtreEquipe.value || undefined,
      tous: filtreStatut.value === 'tous',
    });
  } catch (e) {
    erreur.value = 'Impossible de charger les agents.';
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function creerAgent() {
  if (!nouvelAgent.nom.trim()) return;
  creationEnCours.value = true;
  erreur.value = null;
  try {
    await agentsApi.creer({ ...nouvelAgent, nom: nouvelAgent.nom.trim() });
    nouvelAgent.nom = '';
    nouvelAgent.email = '';
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || "Impossible de créer l'agent.";
  } finally {
    creationEnCours.value = false;
  }
}

async function majAgent(agent: Agent, patch: Partial<Agent>) {
  erreur.value = null;
  try {
    await agentsApi.maj(agent.id, patch);
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || "Impossible de mettre à jour l'agent.";
  }
}

async function basculerActif(agent: Agent) {
  await majAgent(agent, { actif: agent.actif ? 0 : 1 });
}

async function supprimerAgent(agent: Agent) {
  if (!confirm(`Supprimer définitivement "${agent.nom}" ? Cette action est irréversible.`)) return;
  erreur.value = null;
  try {
    await agentsApi.supprimer(agent.id);
    await charger();
  } catch (e: any) {
    erreur.value = e?.response?.data?.error || "Impossible de supprimer l'agent.";
  }
}

const agentsTries = computed(() =>
  [...agents.value].sort((a, b) => b.actif - a.actif || a.nom.localeCompare(b.nom))
);

const equipesConnues = computed(() => {
  const dynamiques = new Set(agents.value.map((a) => a.equipe));
  return [...new Set([...EQUIPES_SUGGEREES, ...dynamiques])];
});
</script>

<template>
  <div class="p-8">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-slate-100">Gestion des agents</h1>
      <p class="text-sm text-slate-500">Ajoutez, renommez ou désactivez les membres des équipes</p>
    </div>

    <p v-if="erreur" class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
      {{ erreur }}
    </p>

    <div class="mb-6 rounded-xl border border-surface-border bg-surface-raised p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-200">Ajouter un agent</h2>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="creerAgent">
        <div>
          <label class="mb-1 block text-xs text-slate-500">Nom *</label>
          <input v-model="nouvelAgent.nom" type="text" placeholder="Prénom Nom" class="input w-56" />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">Équipe *</label>
          <input
            v-model="nouvelAgent.equipe"
            list="equipes-suggerees"
            type="text"
            placeholder="Infrastructure, Direction…"
            class="input w-48"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">Email</label>
          <input v-model="nouvelAgent.email" type="email" placeholder="prenom.nom@yvelines.fr" class="input w-64" />
        </div>
        <button type="submit" class="btn-primary" :disabled="creationEnCours">
          {{ creationEnCours ? 'Ajout…' : '+ Ajouter' }}
        </button>
      </form>
    </div>

    <div class="mb-4 flex flex-wrap gap-3">
      <select v-model="filtreEquipe" class="filtre" @change="charger">
        <option value="">Toutes les équipes</option>
        <option v-for="e in equipesConnues" :key="e" :value="e">{{ e }}</option>
      </select>
      <select v-model="filtreStatut" class="filtre" @change="charger">
        <option value="actifs">Agents actifs</option>
        <option value="tous">Tous (actifs + désactivés)</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-xl border border-surface-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Nom</th>
            <th class="px-4 py-3">Équipe</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Statut</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-border bg-surface-card">
          <tr v-if="chargement">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Chargement…</td>
          </tr>
          <tr v-else-if="agentsTries.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-slate-500">Aucun agent.</td>
          </tr>
          <tr v-for="a in agentsTries" :key="a.id" :class="{ 'opacity-50': !a.actif }">
            <td class="px-4 py-3">
              <input
                type="text"
                class="input-inline"
                :value="a.nom"
                @change="majAgent(a, { nom: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-4 py-3">
              <input
                type="text"
                list="equipes-suggerees"
                class="input-inline"
                :value="a.equipe"
                @change="majAgent(a, { equipe: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-4 py-3">
              <input
                type="email"
                class="input-inline"
                :value="a.email"
                placeholder="—"
                @change="majAgent(a, { email: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full border px-2 py-0.5 text-xs"
                :class="a.actif ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-slate-500/40 bg-slate-600/30 text-slate-400'"
              >
                {{ a.actif ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button class="text-xs text-blue-400 hover:underline" @click="basculerActif(a)">
                  {{ a.actif ? 'Désactiver' : 'Réactiver' }}
                </button>
                <button class="text-xs text-red-400 hover:underline" @click="supprimerAgent(a)">Supprimer</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <datalist id="equipes-suggerees">
      <option v-for="e in EQUIPES_SUGGEREES" :key="e" :value="e" />
    </datalist>
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
