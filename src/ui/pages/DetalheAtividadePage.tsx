import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useConfig } from '../../lib/config'
import { gerarRelatorio, mensagemErro } from '../../lib/ia'
import { criarPasso } from '../../domain/factory'
import {
  deriveStatus,
  estaAtrasada,
  podeConcluirPasso,
  progressoAtividade,
  tempoTotalMin,
} from '../../domain/rules'
import { formatarDuracao, formatarPrazo, hojeISO } from '../../lib/datas'
import type { Atividade, Passo } from '../../domain/types'
import { CriticidadeBadge } from '../components/CriticidadeBadge'
import { BarraProgresso } from '../components/BarraProgresso'

export function DetalheAtividadePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const carregado = useStore((s) => s.carregado)
  const atividades = useStore((s) => s.atividades)
  const salvar = useStore((s) => s.salvar)
  const excluir = useStore((s) => s.excluir)

  const [ativ, setAtiv] = useState<Atividade | null>(null)
  const [novoPasso, setNovoPasso] = useState('')
  const ativRef = useRef<Atividade | null>(null)
  ativRef.current = ativ

  const iaAtivada = useConfig((s) => s.iaAtivada)
  const [relatorio, setRelatorio] = useState<{
    aberto: boolean
    carregando: boolean
    texto: string
    erro: string | null
    copiado: boolean
  }>({ aberto: false, carregando: false, texto: '', erro: null, copiado: false })

  // Carrega do store; preserva edições locais quando a mesma atividade
  // é re-emitida após um salvamento.
  useEffect(() => {
    setAtiv((prev) => {
      if (prev && prev.id === id) return prev
      return atividades.find((a) => a.id === id) ?? null
    })
  }, [id, atividades])

  if (!ativ) {
    return (
      <p className="text-slate-500">
        {carregado ? 'Atividade não encontrada.' : 'Carregando…'}
      </p>
    )
  }

  const atividade = ativ

  function aplicar(passos: Passo[]) {
    const next = { ...atividade, passos }
    setAtiv(next)
    salvar(next)
  }

  function alternarConcluido(passo: Passo) {
    const alvo = !passo.concluido
    if (alvo && !podeConcluirPasso(passo.id, atividade.passos)) return
    const passos = atividade.passos.map((p) =>
      p.id === passo.id ? { ...p, concluido: alvo } : p,
    )
    aplicar(normalizarConcluidos(passos))
  }

  function editarLocal(passoId: string, patch: Partial<Passo>) {
    setAtiv((prev) =>
      prev
        ? { ...prev, passos: prev.passos.map((p) => (p.id === passoId ? { ...p, ...patch } : p)) }
        : prev,
    )
  }

  function salvarLocal() {
    if (ativRef.current) salvar(ativRef.current)
  }

  function adicionarPasso() {
    const texto = novoPasso.trim()
    if (!texto) return
    aplicar([...atividade.passos, criarPasso(texto, atividade.passos.length + 1)])
    setNovoPasso('')
  }

  async function excluirAtividade() {
    if (!confirm(`Excluir a atividade "${atividade.titulo}"? Isso não pode ser desfeito.`)) return
    await excluir(atividade.id)
    navigate('/')
  }

  async function gerarRelatorioIA() {
    setRelatorio({ aberto: true, carregando: true, texto: '', erro: null, copiado: false })
    try {
      const texto = await gerarRelatorio(atividade)
      setRelatorio({ aberto: true, carregando: false, texto, erro: null, copiado: false })
    } catch (e) {
      setRelatorio({ aberto: true, carregando: false, texto: '', erro: mensagemErro(e), copiado: false })
    }
  }

  async function copiarRelatorio() {
    try {
      await navigator.clipboard.writeText(relatorio.texto)
      setRelatorio((r) => ({ ...r, copiado: true }))
    } catch {
      // Clipboard bloqueado — o texto continua selecionável na tela.
    }
  }

  const status = deriveStatus(atividade)
  const atrasada = estaAtrasada(atividade, hojeISO())
  const semPassos = atividade.passos.length === 0

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Voltar
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CriticidadeBadge criticidade={atividade.criticidade} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
          {atrasada && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
              ⚠ Atrasada
            </span>
          )}
        </div>

        <h1 className="mb-1 text-xl font-bold text-slate-900">{atividade.titulo}</h1>
        {atividade.descricao && (
          <p className="mb-4 text-slate-600">{atividade.descricao}</p>
        )}

        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span className={atrasada ? 'font-semibold text-red-600' : ''}>
            Prazo: {formatarPrazo(atividade.prazo)}
          </span>
          <span>Tempo total: {formatarDuracao(tempoTotalMin(atividade))}</span>
        </div>

        <BarraProgresso valor={progressoAtividade(atividade)} />

        <div className="mt-4 flex gap-2">
          <Link
            to={`/atividade/${atividade.id}/editar`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Editar
          </Link>
          <button
            onClick={excluirAtividade}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
          {iaAtivada && (
            <button
              onClick={gerarRelatorioIA}
              className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              ✨ Gerar relatório com IA
            </button>
          )}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Passos
      </h2>

      {semPassos ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm text-slate-500">
            Esta atividade não tem passos. Você pode concluí-la manualmente.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={atividade.concluidaManualmente}
              onChange={(e) => {
                const next = { ...atividade, concluidaManualmente: e.target.checked }
                setAtiv(next)
                salvar(next)
              }}
              className="h-4 w-4 accent-slate-900"
            />
            Marcar como concluída
          </label>
        </div>
      ) : (
        <ul className="mb-4 space-y-2">
          {atividade.passos.map((p, i) => {
            const bloqueado = !p.concluido && !podeConcluirPasso(p.id, atividade.passos)
            const depIndex = p.dependeDe
              ? atividade.passos.findIndex((x) => x.id === p.dependeDe)
              : -1
            return (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={p.concluido}
                    disabled={bloqueado}
                    onChange={() => alternarConcluido(p)}
                    title={bloqueado ? `Depende do passo ${depIndex + 1}` : undefined}
                    className="mt-1 h-4 w-4 accent-emerald-600 disabled:opacity-40"
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm ${p.concluido ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                    >
                      <span className="mr-1 font-semibold text-slate-400">{i + 1}.</span>
                      {p.texto}
                    </p>
                    {bloqueado && (
                      <p className="mt-0.5 text-xs text-amber-600">
                        🔒 Depende do passo {depIndex + 1}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Tempo (min):
                        <input
                          type="number"
                          min={0}
                          value={p.tempoGastoMin ?? ''}
                          onChange={(e) =>
                            editarLocal(p.id, {
                              tempoGastoMin: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          onBlur={salvarLocal}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
                        />
                      </label>
                    </div>

                    <input
                      value={p.observacao}
                      onChange={(e) => editarLocal(p.id, { observacao: e.target.value })}
                      onBlur={salvarLocal}
                      placeholder="Observação (como foi feito)…"
                      className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={novoPasso}
          onChange={(e) => setNovoPasso(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionarPasso()}
          placeholder="Adicionar passo…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          onClick={adicionarPasso}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Adicionar passo
        </button>
      </div>

      {relatorio.aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRelatorio((r) => ({ ...r, aberto: false }))}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Relatório da atividade</h2>
              <div className="flex gap-2">
                {relatorio.texto && (
                  <button
                    onClick={copiarRelatorio}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {relatorio.copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                )}
                <button
                  onClick={() => setRelatorio((r) => ({ ...r, aberto: false }))}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {relatorio.carregando && <p className="text-slate-500">Gerando relatório…</p>}
              {relatorio.erro && <p className="text-sm text-red-600">✕ {relatorio.erro}</p>}
              {relatorio.texto && (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">
                  {relatorio.texto}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Garante a invariante de dependência: nenhum passo fica concluído se a sua
 * dependência não estiver concluída (desmarca em cascata). §4.
 */
function normalizarConcluidos(passos: Passo[]): Passo[] {
  const porId = new Map(passos.map((p) => [p.id, p]))
  let mudou = true
  let atual = passos
  while (mudou) {
    mudou = false
    atual = atual.map((p) => {
      if (p.concluido && p.dependeDe) {
        const dep = porId.get(p.dependeDe)
        if (dep && !dep.concluido) {
          mudou = true
          const novo = { ...p, concluido: false }
          porId.set(p.id, novo)
          return novo
        }
      }
      return p
    })
  }
  return atual
}
