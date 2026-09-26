<script setup lang="ts">
import { computed } from 'vue';
import { COULEURS_EQUIPE, type Equipe } from '../types';

const props = defineProps<{ equipe: Equipe }>();
const couleur = computed(() => COULEURS_EQUIPE[props.equipe]);
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
    :style="{ borderColor: couleur + '55', color: couleur, backgroundColor: couleur + '1a' }"
  >
    <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: couleur }" />
    {{ equipe }}
  </span>
</template>
