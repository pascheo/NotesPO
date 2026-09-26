export type Equipe = 'Infrastructure' | 'Développement' | 'Réseau' | 'Exploitation';
export type Priorite = 'Faible' | 'Normale' | 'Haute' | 'Critique';
export type Etat = 'À faire' | 'En cours' | 'En retard' | 'Terminé';

export const EQUIPES: Equipe[] = ['Infrastructure', 'Développement', 'Réseau', 'Exploitation'];
export const PRIORITES: Priorite[] = ['Faible', 'Normale', 'Haute', 'Critique'];
export const ETATS: Etat[] = ['À faire', 'En cours', 'En retard', 'Terminé'];

export const COULEURS_EQUIPE: Record<Equipe, string> = {
  Infrastructure: '#FF6B6B',
  'Développement': '#4ECDC4',
  'Réseau': '#45B7D1',
  Exploitation: '#FFA07A',
};

export const COULEURS_PRIORITE: Record<Priorite, string> = {
  Faible: '#6B7280',
  Normale: '#60A5FA',
  Haute: '#F59E0B',
  Critique: '#EF4444',
};

export interface Projet {
  id: number;
  nom: string;
  equipe: Equipe;
  description: string;
  date_creation: string;
  date_debut: string | null;
  date_limite: string;
  priorite: Priorite;
  etat: Etat;
  etat_saisi?: Etat;
  progression_global: number;
  responsable: string;
  notes: string;
  archived: 0 | 1;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: number;
  projet_id: number;
  description: string;
  assignee: string;
  progression: number;
  etat: Etat;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export interface Affectation {
  id: number;
  projet_id: number;
  agent: string;
  allocation_pourcentage: number;
  role: string;
  created_at: string;
}

export interface DependanceRef {
  id: number;
  projet_id: number;
  nom: string;
  etat: Etat;
  progression_global: number;
}

export interface ProjetDetail extends Projet {
  actions: Action[];
  affectations: Affectation[];
  dependances: {
    bloque_par: DependanceRef[];
    bloque: DependanceRef[];
  };
}

export interface Agent {
  id: number;
  nom: string;
  equipe: Equipe;
  email: string;
  actif: 0 | 1;
}

export interface ChargeAgent {
  agent: string;
  equipe: Equipe;
  projets: { projet_id: number; nom: string; allocation: number; role: string }[];
  allocation_totale: number;
}

export interface Stats {
  progression_globale: number;
  projets_en_cours: number;
  actions_en_retard: number;
  charge_moyenne_equipe: number;
  charge_par_equipe: Record<string, number>;
  total_projets: number;
  projets_en_retard: number;
}

export interface HistoriqueEntry {
  id: number;
  entite_type: string;
  entite_id: number;
  action: string;
  champs_modifies: Record<string, [unknown, unknown]> | null;
  auteur: string;
  timestamp: string;
}
