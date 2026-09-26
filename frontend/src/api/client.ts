import axios from 'axios';
import type {
  Action,
  Affectation,
  Agent,
  ChargeAgent,
  HistoriqueEntry,
  Projet,
  ProjetDetail,
  RechercheResultats,
  Stats,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export interface ProjetsFiltre {
  equipe?: string;
  etat?: string;
  priorite?: string;
  archived?: '0' | '1';
  sort?: 'deadline' | 'charge' | 'progression';
}

export const projetsApi = {
  liste: (filtres: ProjetsFiltre = {}) =>
    api.get<Projet[]>('/projets', { params: filtres }).then((r) => r.data),
  detail: (id: number) => api.get<ProjetDetail>(`/projets/${id}`).then((r) => r.data),
  creer: (payload: Partial<Projet>) => api.post<Projet>('/projets', payload).then((r) => r.data),
  maj: (id: number, payload: Partial<Projet>) =>
    api.patch<Projet>(`/projets/${id}`, payload).then((r) => r.data),
  archiver: (id: number) => api.delete(`/projets/${id}`).then((r) => r.data),
  ajouterAction: (id: number, payload: Partial<Action>) =>
    api.post<Action>(`/projets/${id}/actions`, payload).then((r) => r.data),
};

export const actionsApi = {
  maj: (id: number, payload: Partial<Action>) =>
    api.patch<Action>(`/actions/${id}`, payload).then((r) => r.data),
  supprimer: (id: number) => api.delete(`/actions/${id}`).then((r) => r.data),
};

export const affectationsApi = {
  charge: () => api.get<ChargeAgent[]>('/affectations/charge').then((r) => r.data),
  creer: (payload: Partial<Affectation> & { projet_id: number; agent: string }) =>
    api.post<Affectation>('/affectations', payload).then((r) => r.data),
  maj: (id: number, payload: Partial<Affectation>) =>
    api.patch<Affectation>(`/affectations/${id}`, payload).then((r) => r.data),
  supprimer: (id: number) => api.delete(`/affectations/${id}`).then((r) => r.data),
};

export const agentsApi = {
  liste: (params: { equipe?: string; tous?: boolean } = {}) =>
    api
      .get<Agent[]>('/agents', { params: { equipe: params.equipe, tous: params.tous ? '1' : undefined } })
      .then((r) => r.data),
  creer: (payload: { nom: string; equipe: string; email?: string }) =>
    api.post<Agent>('/agents', payload).then((r) => r.data),
  maj: (id: number, payload: Partial<Pick<Agent, 'nom' | 'equipe' | 'email' | 'actif'>>) =>
    api.patch<Agent>(`/agents/${id}`, payload).then((r) => r.data),
  supprimer: (id: number) => api.delete(`/agents/${id}`).then((r) => r.data),
};

export const historiqueApi = {
  liste: (params: { entite_type?: string; entite_id?: number; limit?: number } = {}) =>
    api.get<HistoriqueEntry[]>('/historique', { params }).then((r) => r.data),
};

export const dependancesApi = {
  creer: (payload: { projet_source: number; projet_cible: number; type?: string }) =>
    api.post('/dependances', payload).then((r) => r.data),
  supprimer: (id: number) => api.delete(`/dependances/${id}`).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get<Stats>('/stats').then((r) => r.data),
};

export const rechercheApi = {
  chercher: (q: string) =>
    api.get<RechercheResultats>('/recherche', { params: { q } }).then((r) => r.data),
};

export const exportApi = {
  telechargerProjets: async (equipe?: string) => {
    const response = await api.get('/export/projets', {
      params: equipe ? { equipe } : {},
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="(.+)"/);
    const nomFichier = match?.[1] || 'export_projets.xlsx';

    const url = URL.createObjectURL(response.data as Blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
  },
};

export default api;
