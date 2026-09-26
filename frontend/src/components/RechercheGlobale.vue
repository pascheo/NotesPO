<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { rechercheApi } from '../api/client';
import type { RechercheResultats } from '../types';

const router = useRouter();
const requete = ref('');
const resultats = ref<RechercheResultats>({ projets: [], actions: [] });
const ouvert = ref(false);
const chargement = ref(false);
let debounce: ReturnType<typeof setTimeout> | null = null;

function onInput() {
  if (debounce) clearTimeout(debounce);
  if (requete.value.trim().length < 2) {
    resultats.value = { projets: [], actions: [] };
    ouvert.value = false;
    return;
  }
  debounce = setTimeout(async () => {
    chargement.value = true;
    try {
      resultats.value = await rechercheApi.chercher(requete.value.trim());
      ouvert.value = true;
    } finally {
      chargement.value = false;
    }
  }, 300);
}

function allerAuProjet(id: number) {
  ouvert.value = false;
  requete.value = '';
  router.push(`/projets/${id}`);
}

function fermer() {
  setTimeout(() => (ouvert.value = false), 150);
}

const aDesResultats = () => resultats.value.projets.length > 0 || resultats.value.actions.length > 0;
</script>

<template>
  <div class="relative">
    <div class="relative">
      <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
      <input
        v-model="requete"
        type="text"
        placeholder="Rechercher un projet, une action…"
        class="w-full rounded-lg border border-surface-border bg-surface-card py-1.5 pl-8 pr-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500"
        @input="onInput"
        @focus="requete.trim().length >= 2 && (ouvert = true)"
        @blur="fermer"
      />
    </div>

    <div
      v-if="ouvert"
      class="absolute left-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-xl"
    >
      <p v-if="chargement" class="px-3 py-3 text-xs text-slate-500">Recherche…</p>
      <template v-else-if="aDesResultats()">
        <div v-if="resultats.projets.length > 0">
          <p class="px-3 pt-2 text-[11px] uppercase tracking-wide text-slate-500">Projets</p>
          <button
            v-for="p in resultats.projets"
            :key="'p' + p.id"
            class="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-raised"
            @mousedown.prevent="allerAuProjet(p.id)"
          >
            {{ p.nom }}
            <span class="ml-1 text-xs text-slate-500">({{ p.equipe }})</span>
          </button>
        </div>
        <div v-if="resultats.actions.length > 0">
          <p class="px-3 pt-2 text-[11px] uppercase tracking-wide text-slate-500">Actions</p>
          <button
            v-for="a in resultats.actions"
            :key="'a' + a.id"
            class="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-raised"
            @mousedown.prevent="allerAuProjet(a.projet_id)"
          >
            {{ a.description }}
            <span class="ml-1 text-xs text-slate-500">({{ a.projet_nom }})</span>
          </button>
        </div>
      </template>
      <p v-else class="px-3 py-3 text-xs text-slate-500">Aucun résultat pour « {{ requete }} ».</p>
    </div>
  </div>
</template>
