// Estilos visuais por criticidade (verde/amarelo/laranja/vermelho — §9).

import type { Criticidade } from '../domain/types'

export interface EstiloCriticidade {
  emoji: string
  badge: string
  bordaCard: string
}

export const ESTILO_CRITICIDADE: Record<Criticidade, EstiloCriticidade> = {
  Baixa: {
    emoji: '🟢',
    badge: 'bg-emerald-100 text-emerald-700',
    bordaCard: 'border-l-emerald-400',
  },
  Média: {
    emoji: '🟡',
    badge: 'bg-amber-100 text-amber-700',
    bordaCard: 'border-l-amber-400',
  },
  Alta: {
    emoji: '🟠',
    badge: 'bg-orange-100 text-orange-700',
    bordaCard: 'border-l-orange-400',
  },
  Urgente: {
    emoji: '🔴',
    badge: 'bg-red-100 text-red-700',
    bordaCard: 'border-l-red-500',
  },
}

export const CRITICIDADES: Criticidade[] = ['Baixa', 'Média', 'Alta', 'Urgente']
