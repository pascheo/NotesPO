<script setup lang="ts">
import Sidebar from './components/Sidebar.vue';
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface">
    <Sidebar />
    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>
