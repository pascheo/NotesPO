<script setup lang="ts">
defineProps<{ valeur: number; couleur?: string }>();
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="h-2 flex-1 overflow-hidden rounded-full bg-surface-border">
      <div
        class="h-full rounded-full transition-all"
        :style="{ width: `${valeur}%`, backgroundColor: couleur || '#60A5FA' }"
      />
    </div>
    <span class="w-9 text-right text-xs tabular-nums text-slate-400">{{ valeur }}%</span>
  </div>
</template>
