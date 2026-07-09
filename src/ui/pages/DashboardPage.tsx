import { Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { atividadesExemplo } from '../../domain/exemplos'
import {
  compararDashboard,
  estaAtrasada,
  progressoAtividade,
  progressoGeral,
} from '../../domain/rules'
import { hojeISO, formatarPrazo } from '../../lib/datas'
import type { Atividade } from '../../domain/types'
import { CriticidadeBadge } from '../components/CriticidadeBadge'
import { BarraProgresso } from '../components/BarraProgresso'
import { ESTILO_CRITICIDADE } from '../criticidade'

export function DashboardPage() {
  const atividades = useStore((s) => s.atividades)
  const criar = useStore((s) => s.criar)
  const hoje = hojeISO()

  const ordenadas = atividades.slice().sort((a, b) => compararDashboard(a, b, hoje))
  const geral = progressoGeral(atividades)

  async function carregarExemplos() {
    for (const dados of atividadesExemplo()) await criar(dados)
  }

  if (atividades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-lg font-medium text-slate-700">Nenhuma atividade ainda</p>
        <p className="mt-1 text-slate-500">
          Crie sua primeira atividade ou carregue exemplos para ver o app funcionando.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/nova"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Criar primeira atividade
          </Link>
          <button
            onClick={carregarExemplos}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Carregar exemplos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex-1">
          <h1 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Progresso geral
          </h1>
          <BarraProgresso valor={geral} />
        </div>
        <Link
          to="/nova"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Nova atividade
        </Link>
      </div>

      <ul className="space-y-3">
        {ordenadas.map((a) => (
          <li key={a.id}>
            <CardAtividade atividade={a} hoje={hoje} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardAtividade({ atividade, hoje }: { atividade: Atividade; hoje: string }) {
  const total = atividade.passos.length
  const concluidos = atividade.passos.filter((p) => p.concluido).length
  const atrasada = estaAtrasada(atividade, hoje)
  const borda = ESTILO_CRITICIDADE[atividade.criticidade].bordaCard

  return (
    <Link
      to={`/atividade/${atividade.id}`}
      className={`block rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${borda}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CriticidadeBadge criticidade={atividade.criticidade} />
          {atrasada && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
              ⚠ Atrasada
            </span>
          )}
        </div>
        <span className={`text-sm ${atrasada ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
          Prazo: {formatarPrazo(atividade.prazo)}
        </span>
      </div>

      <p className="mb-3 font-medium text-slate-800">{atividade.titulo}</p>

      <BarraProgresso valor={progressoAtividade(atividade)} />
      <p className="mt-1.5 text-xs text-slate-500">
        {total === 0 ? 'Sem passos' : `${concluidos} de ${total} passos concluídos`}
      </p>
    </Link>
  )
}
