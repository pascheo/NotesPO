import { defineStore } from 'pinia';
import { projetsApi, statsApi, type ProjetsFiltre } from '../api/client';
import type { Projet, Stats } from '../types';

interface State {
  projets: Projet[];
  stats: Stats | null;
  chargement: boolean;
  erreur: string | null;
  filtreEquipe: string | null;
}

export const useProjetsStore = defineStore('projets', {
  state: (): State => ({
    projets: [],
    stats: null,
    chargement: false,
    erreur: null,
    filtreEquipe: null,
  }),
  actions: {
    async charger(filtres: ProjetsFiltre = {}) {
      this.chargement = true;
      this.erreur = null;
      try {
        this.projets = await projetsApi.liste(filtres);
      } catch (e) {
        this.erreur = "Impossible de charger les projets. Vérifiez que l'API est démarrée.";
      } finally {
        this.chargement = false;
      }
    },
    async chargerStats() {
      try {
        this.stats = await statsApi.get();
      } catch (e) {
        this.erreur = 'Impossible de charger les statistiques.';
      }
    },
    async mettreAJourEtat(id: number, etat: Projet['etat']) {
      const projet = this.projets.find((p) => p.id === id);
      const ancienEtat = projet?.etat;
      if (projet) projet.etat = etat;
      try {
        await projetsApi.maj(id, { etat });
      } catch (e) {
        if (projet && ancienEtat) projet.etat = ancienEtat;
        this.erreur = "Impossible de mettre à jour l'état du projet.";
      }
    },
  },
});
