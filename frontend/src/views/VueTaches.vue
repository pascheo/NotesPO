<script setup lang="ts">
import TachesPanel from '../components/TachesPanel.vue';
</script>

<template>
  <div class="p-8">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-slate-100">Tâches</h1>
      <p class="text-sm text-slate-500">
        Micro-tâches libres, assignables à un agent, non rattachées à un projet
      </p>
    </div>

    <TachesPanel />
  </div>
</template>
