<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { EQUIPES, PRIORITES, type Agent, type Equipe, type Priorite } from '../types';
import { agentsApi, projetsApi } from '../api/client';

const props = withDefaults(
  defineProps<{ createdByDefault?: string; responsableDefaut?: string }>(),
  { createdByDefault: 'DSI', responsableDefaut: '' }
);
const emit = defineEmits<{ close: []; created: [] }>();

const agents = ref<Agent[]>([]);
onMounted(async () => {
  agents.value = await agentsApi.liste();
});

const form = reactive({
  nom: '',
  equipe: 'Infrastructure' as Equipe,
  description: '',
  date_debut: '',
  date_limite: '',
  priorite: 'Normale' as Priorite,
  responsable: props.responsableDefaut,
});

const erreur = ref<string | null>(null);
const envoi = ref(false);

async function soumettre() {
  erreur.value = null;
  if (!form.nom.trim() || !form.date_limite) {
    erreur.value = 'Le nom et la date limite sont obligatoires.';
    return;
  }
  envoi.value = true;
  try {
    await projetsApi.creer({ ...form, created_by: props.createdByDefault });
    emit('created');
    emit('close');
  } catch (e) {
    erreur.value = 'Erreur lors de la création du projet.';
  } finally {
    envoi.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-100">Nouveau projet</h2>
        <button class="text-slate-500 hover:text-slate-200" @click="$emit('close')">✕</button>
      </div>

      <form class="space-y-3" @submit.prevent="soumettre">
        <div>
          <label class="mb-1 block text-xs text-slate-400">Nom du projet *</label>
          <input v-model="form.nom" type="text" class="input" placeholder="Ex : Migration serveurs" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs text-slate-400">Équipe *</label>
            <select v-model="form.equipe" class="input">
              <option v-for="e in EQUIPES" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-400">Priorité</label>
            <select v-model="form.priorite" class="input">
              <option v-for="p in PRIORITES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs text-slate-400">Date de début</label>
            <input v-model="form.date_debut" type="date" class="input" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-400">Date limite *</label>
            <input v-model="form.date_limite" type="date" class="input" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-400">Responsable</label>
          <select v-model="form.responsable" class="input">
            <option value="">Non assigné</option>
            <option
              v-if="form.responsable && !agents.some((a) => a.nom === form.responsable)"
              :value="form.responsable"
            >
              {{ form.responsable }}
            </option>
            <option v-for="a in agents" :key="a.id" :value="a.nom">{{ a.nom }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-400">Description</label>
          <textarea v-model="form.description" rows="3" class="input resize-none" />
        </div>

        <p v-if="erreur" class="text-xs text-red-400">{{ erreur }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="$emit('close')">Annuler</button>
          <button type="submit" class="btn-primary" :disabled="envoi">
            {{ envoi ? 'Création…' : 'Créer le projet' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500;
}
.btn-primary {
  @apply rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50;
}
.btn-secondary {
  @apply rounded-lg border border-surface-border px-4 py-2 text-sm text-slate-300 hover:bg-surface-card;
}
</style>
