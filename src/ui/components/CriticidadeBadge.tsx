import type { Criticidade } from '../../domain/types'
import { ESTILO_CRITICIDADE } from '../criticidade'

export function CriticidadeBadge({ criticidade }: { criticidade: Criticidade }) {
  const estilo = ESTILO_CRITICIDADE[criticidade]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilo.badge}`}
    >
      <span aria-hidden>{estilo.emoji}</span>
      {criticidade}
    </span>
  )
}
