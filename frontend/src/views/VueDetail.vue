<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { actionsApi, affectationsApi, agentsApi, projetsApi } from '../api/client';
import type { Action, Affectation, Agent, Etat, ProjetDetail } from '../types';
import { ETATS, PRIORITES } from '../types';
import TagEquipe from '../components/TagEquipe.vue';
import BarreProgression from '../components/BarreProgression.vue';
import { classeEtat, classePriorite, formatDate } from '../utils/format';

const props = defineProps<{ id: string }>();
const router = useRouter();

const projet = ref<ProjetDetail | null>(null);
const chargement = ref(true);
const erreur = ref<string | null>(null);
const agentsDisponibles = ref<Agent[]>([]);

const nouvelleAction = reactive({ description: '', assignee: '' });
const nouvelleAffectation = reactive({ agent: '', allocation_pourcentage: 50, role: 'Contributeur' });

async function charger() {
  chargement.value = true;
  try {
    projet.value = await projetsApi.detail(Number(props.id));
    agentsDisponibles.value = await agentsApi.liste();
  } catch (e) {
    erreur.value = 'Projet introuvable.';
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function majChamp(champ: keyof ProjetDetail, valeur: unknown) {
  if (!projet.value) return;
  await projetsApi.maj(projet.value.id, { [champ]: valeur } as any);
  await charger();
}

async function ajouterAction() {
  if (!projet.value || !nouvelleAction.description.trim()) return;
  await projetsApi.ajouterAction(projet.value.id, {
    description: nouvelleAction.description,
    assignee: nouvelleAction.assignee,
  });
  nouvelleAction.description = '';
  nouvelleAction.assignee = '';
  await charger();
}

async function majAction(action: Action, patch: Partial<Action>) {
  await actionsApi.maj(action.id, patch);
  await charger();
}

async function supprimerAction(action: Action) {
  await actionsApi.supprimer(action.id);
  await charger();
}

async function ajouterAffectation() {
  if (!projet.value || !nouvelleAffectation.agent) return;
  await affectationsApi.creer({
    projet_id: projet.value.id,
    agent: nouvelleAffectation.agent,
    allocation_pourcentage: nouvelleAffectation.allocation_pourcentage,
    role: nouvelleAffectation.role,
  });
  nouvelleAffectation.agent = '';
  nouvelleAffectation.allocation_pourcentage = 50;
  await charger();
}

async function supprimerAffectation(aff: Affectation) {
  await affectationsApi.supprimer(aff.id);
  await charger();
}

async function archiver() {
  if (!projet.value) return;
  if (!confirm(`Archiver le projet "${projet.value.nom}" ? Cette action peut être annulée par un administrateur.`)) return;
  await projetsApi.archiver(projet.value.id);
  router.push('/synthese');
}

let notesTimeout: ReturnType<typeof setTimeout> | null = null;
function onNotesInput(valeur: string) {
  if (notesTimeout) clearTimeout(notesTimeout);
  notesTimeout = setTimeout(() => majChamp('notes', valeur), 600);
}
</script>

<template>
  <div class="p-8" v-if="chargement">
    <p class="text-slate-500">Chargement…</p>
  </div>
  <div class="p-8" v-else-if="erreur || !projet">
    <p class="text-red-400">{{ erreur }}</p>
    <button class="mt-4 text-sm text-blue-400 hover:underline" @click="router.push('/synthese')">← Retour</button>
  </div>
  <div class="p-8" v-else>
    <button class="mb-4 text-sm text-slate-500 hover:text-slate-200" @click="router.push('/synthese')">← Retour à la synthèse</button>

    <div class="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-raised p-6">
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-semibold text-slate-100">{{ projet.nom }}</h1>
          <span class="rounded-full border px-2 py-0.5 text-xs" :class="classeEtat(projet.etat)">{{ projet.etat }}</span>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" :class="classePriorite(projet.priorite)">{{ projet.priorite }}</span>
        </div>
        <TagEquipe :equipe="projet.equipe" />
        <p class="max-w-xl text-sm text-slate-400">{{ projet.description }}</p>
      </div>
      <div class="w-full max-w-xs space-y-3">
        <BarreProgression :valeur="projet.progression_global" />
        <button class="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20" @click="archiver">
          🗄️ Archiver le projet
        </button>
      </div>
    </div>

    <div class="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-surface-border bg-surface-raised p-6 sm:grid-cols-4">
      <div>
        <p class="text-xs text-slate-500">Créé par</p>
        <p class="text-sm text-slate-200">{{ projet.created_by || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Date de création</p>
        <p class="text-sm text-slate-200">{{ formatDate(projet.date_creation.slice(0, 10)) }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Date limite</p>
        <input
          type="date"
          class="input-inline"
          :value="projet.date_limite"
          @change="majChamp('date_limite', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <p class="text-xs text-slate-500">Responsable</p>
        <input
          type="text"
          class="input-inline"
          :value="projet.responsable"
          @change="majChamp('responsable', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Actions -->
      <div class="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 class="mb-4 text-sm font-semibold text-slate-200">Actions / Sous-tâches</h2>
        <div class="space-y-2">
          <div
            v-for="a in projet.actions"
            :key="a.id"
            class="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card p-2"
          >
            <input
              type="text"
              class="flex-1 bg-transparent text-sm text-slate-200 outline-none"
              :value="a.description"
              @change="majAction(a, { description: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="w-28 rounded bg-surface-border/40 px-2 py-1 text-xs text-slate-300 outline-none"
              placeholder="Assigné à"
              :value="a.assignee"
              @change="majAction(a, { assignee: ($event.target as HTMLInputElement).value })"
            />
            <select
              class="rounded bg-surface-border/40 px-2 py-1 text-xs text-slate-300 outline-none"
              :value="a.etat"
              @change="majAction(a, { etat: ($event.target as HTMLSelectElement).value as Etat })"
            >
              <option v-for="e in ETATS" :key="e" :value="e">{{ e }}</option>
            </select>
            <select
              class="w-16 rounded bg-surface-border/40 px-2 py-1 text-xs text-slate-300 outline-none"
              :value="a.progression"
              @change="majAction(a, { progression: Number(($event.target as HTMLSelectElement).value) })"
            >
              <option v-for="v in [0, 25, 50, 75, 100]" :key="v" :value="v">{{ v }}%</option>
            </select>
            <button class="text-slate-500 hover:text-red-400" @click="supprimerAction(a)">✕</button>
          </div>
          <p v-if="projet.actions.length === 0" class="text-xs text-slate-600">Aucune action pour ce projet.</p>
        </div>
        <div class="mt-3 flex gap-2">
          <input
            v-model="nouvelleAction.description"
            type="text"
            placeholder="Nouvelle action…"
            class="input flex-1"
            @keyup.enter="ajouterAction"
          />
          <input v-model="nouvelleAction.assignee" type="text" placeholder="Assigné à" class="input w-32" @keyup.enter="ajouterAction" />
          <button class="btn-primary" @click="ajouterAction">Ajouter</button>
        </div>
      </div>

      <!-- Affectations -->
      <div class="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 class="mb-4 text-sm font-semibold text-slate-200">Affectations</h2>
        <div class="space-y-2">
          <div
            v-for="aff in projet.affectations"
            :key="aff.id"
            class="flex items-center justify-between rounded-lg border border-surface-border bg-surface-card p-2 text-sm"
          >
            <span class="text-slate-200">{{ aff.agent }}</span>
            <span class="text-xs text-slate-500">{{ aff.role }}</span>
            <span class="text-sm font-medium text-blue-400">{{ aff.allocation_pourcentage }}%</span>
            <button class="text-slate-500 hover:text-red-400" @click="supprimerAffectation(aff)">✕</button>
          </div>
          <p v-if="projet.affectations.length === 0" class="text-xs text-slate-600">Aucun agent affecté.</p>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <select v-model="nouvelleAffectation.agent" class="input flex-1">
            <option value="">Choisir un agent…</option>
            <option v-for="ag in agentsDisponibles" :key="ag.id" :value="ag.nom">{{ ag.nom }} ({{ ag.equipe }})</option>
          </select>
          <input
            v-model.number="nouvelleAffectation.allocation_pourcentage"
            type="number"
            min="0"
            max="100"
            class="input w-24"
          />
          <button class="btn-primary" @click="ajouterAffectation">Affecter</button>
        </div>
      </div>

      <!-- Dépendances -->
      <div class="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 class="mb-4 text-sm font-semibold text-slate-200">Dépendances</h2>
        <div class="mb-3">
          <p class="mb-1 text-xs text-slate-500">Bloqué par</p>
          <div v-if="projet.dependances.bloque_par.length === 0" class="text-xs text-slate-600">Aucune dépendance bloquante</div>
          <router-link
            v-for="d in projet.dependances.bloque_par"
            :key="d.id"
            :to="`/projets/${d.projet_id}`"
            class="mb-1 block rounded-lg border border-surface-border bg-surface-card p-2 text-sm text-slate-300 hover:border-blue-500/50"
          >
            {{ d.nom }} <span class="text-xs text-slate-500">({{ d.etat }} · {{ d.progression_global }}%)</span>
          </router-link>
        </div>
        <div>
          <p class="mb-1 text-xs text-slate-500">Bloque</p>
          <div v-if="projet.dependances.bloque.length === 0" class="text-xs text-slate-600">Ne bloque aucun projet</div>
          <router-link
            v-for="d in projet.dependances.bloque"
            :key="d.id"
            :to="`/projets/${d.projet_id}`"
            class="mb-1 block rounded-lg border border-surface-border bg-surface-card p-2 text-sm text-slate-300 hover:border-blue-500/50"
          >
            {{ d.nom }} <span class="text-xs text-slate-500">({{ d.etat }} · {{ d.progression_global }}%)</span>
          </router-link>
        </div>
      </div>

      <!-- Notes -->
      <div class="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 class="mb-4 text-sm font-semibold text-slate-200">Notes</h2>
        <textarea
          class="input h-40 w-full resize-none"
          placeholder="Notes libres sur le projet…"
          :value="projet.notes"
          @input="onNotesInput(($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500;
}
.input-inline {
  @apply w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm text-slate-200 outline-none hover:border-surface-border focus:border-blue-500 focus:bg-surface-card focus:px-2;
}
.btn-primary {
  @apply rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500;
}
</style>
