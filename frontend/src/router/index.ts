import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/synthese',
    },
    {
      path: '/synthese',
      name: 'synthese',
      component: () => import('../views/VueSynthetique.vue'),
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: () => import('../views/VueKanban.vue'),
    },
    {
      path: '/gantt',
      name: 'gantt',
      component: () => import('../views/VueGantt.vue'),
    },
    {
      path: '/historique',
      name: 'historique',
      component: () => import('../views/VueHistorique.vue'),
    },
    {
      path: '/agents',
      name: 'agents',
      component: () => import('../views/VueAgents.vue'),
    },
    {
      path: '/projets/:id',
      name: 'projet-detail',
      component: () => import('../views/VueDetail.vue'),
      props: true,
    },
  ],
});

export default router;
