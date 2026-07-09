import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { formatarDataHora, formatarDuracao } from '../../lib/datas'
import type { Criticidade } from '../../domain/types'
import { CRITICIDADES } from '../criticidade'
import { CriticidadeBadge } from '../components/CriticidadeBadge'

type Periodo = 'tudo' | '7' | '30'

export function HistoricoPage() {
  const historico = useStore((s) => s.historico)
  const [periodo, setPeriodo] = useState<Periodo>('tudo')
  const [criticidade, setCriticidade] = useState<Criticidade | 'Todas'>('Todas')

  const filtrado = useMemo(() => {
    const corte =
      periodo === 'tudo' ? 0 : Date.now() - Number(periodo) * 24 * 60 * 60 * 1000
    return historico
      .filter((r) => (corte === 0 ? true : new Date(r.em).getTime() >= corte))
      .filter((r) => (criticidade === 'Todas' ? true : r.criticidade === criticidade))
      .slice()
      .sort((a, b) => (a.em < b.em ? 1 : a.em > b.em ? -1 : 0))
  }, [historico, periodo, criticidade])

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Histórico</h1>

      <div className="mb-5 flex flex-wrap gap-4">
        <Filtro rotulo="Período">
          <Select value={periodo} onChange={(v) => setPeriodo(v as Periodo)}>
            <option value="tudo">Tudo</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </Select>
        </Filtro>
        <Filtro rotulo="Criticidade">
          <Select
            value={criticidade}
            onChange={(v) => setCriticidade(v as Criticidade | 'Todas')}
          >
            <option value="Todas">Todas</option>
            {CRITICIDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Filtro>
      </div>

      {filtrado.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
          Nenhum registro no período. O histórico é gerado quando uma atividade muda de status.
        </p>
      ) : (
        <ol className="space-y-2">
          {filtrado.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="font-medium text-slate-800">{r.titulo}</p>
                <p className="text-sm text-slate-500">
                  {r.de ? `${r.de} → ` : ''}
                  <span className="font-medium text-slate-700">{r.para}</span>
                  {' · '}
                  {formatarDataHora(r.em)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>{formatarDuracao(r.tempoTotalMin)}</span>
                <CriticidadeBadge criticidade={r.criticidade} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Filtro({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {rotulo}
      </label>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-900"
    >
      {children}
    </select>
  )
}
