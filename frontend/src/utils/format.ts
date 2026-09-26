import type { Etat, Priorite } from '../types';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function joursRestants(dateLimite: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limite = new Date(dateLimite + 'T00:00:00');
  return Math.round((limite.getTime() - today.getTime()) / 86400000);
}

export function classeEtat(etat: Etat): string {
  switch (etat) {
    case 'À faire':
      return 'bg-slate-600/30 text-slate-300 border-slate-500/40';
    case 'En cours':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'En retard':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'Terminé':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    default:
      return 'bg-slate-600/30 text-slate-300 border-slate-500/40';
  }
}

export function classePriorite(priorite: Priorite): string {
  switch (priorite) {
    case 'Faible':
      return 'bg-slate-600/30 text-slate-300';
    case 'Normale':
      return 'bg-blue-500/20 text-blue-300';
    case 'Haute':
      return 'bg-amber-500/20 text-amber-300';
    case 'Critique':
      return 'bg-red-500/25 text-red-300';
    default:
      return 'bg-slate-600/30 text-slate-300';
  }
}

export function classeAllocation(pct: number): { classe: string; icone: string; label: string } {
  if (pct > 100) return { classe: 'text-red-400', icone: '🔴', label: 'Surcharge' };
  if (pct >= 75) return { classe: 'text-amber-400', icone: '🟡', label: 'Élevée' };
  if (pct >= 20) return { classe: 'text-emerald-400', icone: '🟢', label: 'Optimale' };
  return { classe: 'text-slate-400', icone: '⚪', label: 'Sous-utilisé' };
}
