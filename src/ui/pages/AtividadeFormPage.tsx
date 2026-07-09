import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useConfig } from '../../lib/config'
import { mensagemErro, sugerirNotas, sugerirPassos } from '../../lib/ia'
import { criarPasso } from '../../domain/factory'
import { classificarCriticidade, temCicloDependencias } from '../../domain/rules'
import type {
  Criticidade,
  ModoCriticidade,
  NotasQuestionario,
  Passo,
} from '../../domain/types'
import { CRITICIDADES } from '../criticidade'
import { CriticidadeBadge } from '../components/CriticidadeBadge'

export function AtividadeFormPage() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()
  const atividades = useStore((s) => s.atividades)
  const criar = useStore((s) => s.criar)
  const salvar = useStore((s) => s.salvar)
  const existente = id ? atividades.find((a) => a.id === id) : undefined

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState('')
  const [modo, setModo] = useState<ModoCriticidade>('Manual')
  const [criticidadeManual, setCriticidadeManual] = useState<Criticidade>('Média')
  const [notas, setNotas] = useState<NotasQuestionario>({
    urgencia: 3,
    impacto: 3,
    dependencia: 3,
  })
  const [passos, setPassos] = useState<Passo[]>([])
  const [novoPasso, setNovoPasso] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const iaAtivada = useConfig((s) => s.iaAtivada)
  const [iaCarregando, setIaCarregando] = useState<'passos' | 'notas' | null>(null)
  const [iaErro, setIaErro] = useState<string | null>(null)

  async function sugerirPassosIA() {
    if (!titulo.trim()) {
      setIaErro('Informe um título antes de pedir sugestões.')
      return
    }
    setIaErro(null)
    setIaCarregando('passos')
    try {
      const sugeridos = await sugerirPassos(titulo, descricao)
      const base = passos.length
      const criados = sugeridos.map((s, i) => criarPasso(s.texto, base + i + 1))
      sugeridos.forEach((s, i) => {
        const alvo = s.dependeDeOrdem - 1
        if (alvo >= 0 && alvo < criados.length && alvo !== i) {
          criados[i].dependeDe = criados[alvo].id
        }
      })
      setPassos((atual) => [...atual, ...criados])
    } catch (e) {
      setIaErro(mensagemErro(e))
    } finally {
      setIaCarregando(null)
    }
  }

  async function sugerirNotasIA() {
    if (!titulo.trim()) {
      setIaErro('Informe um título antes de pedir sugestões.')
      return
    }
    setIaErro(null)
    setIaCarregando('notas')
    try {
      setNotas(await sugerirNotas(titulo, descricao))
    } catch (e) {
      setIaErro(mensagemErro(e))
    } finally {
      setIaCarregando(null)
    }
  }

  // Carrega dados ao editar (quando a atividade estiver disponível no store).
  useEffect(() => {
    if (!existente) return
    setTitulo(existente.titulo)
    setDescricao(existente.descricao)
    setPrazo(existente.prazo ?? '')
    setModo(existente.modoCriticidade)
    setCriticidadeManual(existente.criticidade)
    if (existente.notasQuestionario) setNotas(existente.notasQuestionario)
    setPassos(existente.passos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existente?.id])

  const criticidade =
    modo === 'Questionario' ? classificarCriticidade(notas) : criticidadeManual

  function moverPasso(index: number, delta: number) {
    const novo = passos.slice()
    const alvo = index + delta
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    setPassos(reindexar(novo))
  }

  function removerPasso(passoId: string) {
    // Remove e limpa dependências que apontavam para ele.
    const novo = passos
      .filter((p) => p.id !== passoId)
      .map((p) => (p.dependeDe === passoId ? { ...p, dependeDe: null } : p))
    setPassos(reindexar(novo))
  }

  function adicionarPasso() {
    const texto = novoPasso.trim()
    if (!texto) return
    setPassos((atual) => [...atual, criarPasso(texto, atual.length + 1)])
    setNovoPasso('')
  }

  function editarPasso(passoId: string, patch: Partial<Passo>) {
    setPassos((atual) => atual.map((p) => (p.id === passoId ? { ...p, ...patch } : p)))
  }

  async function submeter() {
    setErro(null)
    if (!titulo.trim()) {
      setErro('O título é obrigatório.')
      return
    }
    if (temCicloDependencias(passos)) {
      setErro('Há dependência circular entre os passos. Ajuste antes de salvar.')
      return
    }

    const dados = {
      titulo,
      descricao,
      prazo: prazo || null,
      criticidade,
      modoCriticidade: modo,
      notasQuestionario: modo === 'Questionario' ? notas : null,
      passos: reindexar(passos),
    }

    if (existente) {
      await salvar({
        ...existente,
        ...dados,
      })
      navigate(`/atividade/${existente.id}`)
    } else {
      const nova = await criar(dados)
      navigate(`/atividade/${nova.id}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">
        {editando ? 'Editar atividade' : 'Nova atividade'}
      </h1>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}
      {iaErro && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {iaErro}
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <Campo rotulo="Título *">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Corrigir bug no login"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </Campo>

        <Campo rotulo="Descrição">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </Campo>

        <Campo rotulo="Prazo">
          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </Campo>

        <Campo rotulo="Criticidade">
          <div className="mb-3 inline-flex rounded-lg border border-slate-300 p-0.5 text-sm">
            <BotaoToggle ativo={modo === 'Manual'} onClick={() => setModo('Manual')}>
              Manual
            </BotaoToggle>
            <BotaoToggle
              ativo={modo === 'Questionario'}
              onClick={() => setModo('Questionario')}
            >
              Questionário
            </BotaoToggle>
          </div>

          {modo === 'Manual' ? (
            <div className="flex flex-wrap gap-2">
              {CRITICIDADES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCriticidadeManual(c)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    criticidadeManual === c
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Slider
                rotulo="Urgência do prazo"
                valor={notas.urgencia}
                onChange={(v) => setNotas({ ...notas, urgencia: v })}
              />
              <Slider
                rotulo="Impacto se não for feito"
                valor={notas.impacto}
                onChange={(v) => setNotas({ ...notas, impacto: v })}
              />
              <Slider
                rotulo="Bloqueia outras tarefas / terceiros"
                valor={notas.dependencia}
                onChange={(v) => setNotas({ ...notas, dependencia: v })}
              />
              <p className="text-sm text-slate-500">
                Resultado:{' '}
                <span className="font-medium text-slate-700">
                  <CriticidadeBadge criticidade={criticidade} />
                </span>
              </p>
              {iaAtivada && (
                <button
                  type="button"
                  onClick={sugerirNotasIA}
                  disabled={iaCarregando !== null}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  {iaCarregando === 'notas' ? 'Sugerindo…' : '✨ Sugerir notas com IA'}
                </button>
              )}
            </div>
          )}
        </Campo>

        <Campo rotulo="Passos">
          {iaAtivada && (
            <button
              type="button"
              onClick={sugerirPassosIA}
              disabled={iaCarregando !== null}
              className="mb-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              {iaCarregando === 'passos' ? 'Sugerindo…' : '✨ Sugerir passos com IA'}
            </button>
          )}
          {passos.length === 0 && (
            <p className="mb-2 text-sm text-slate-400">Nenhum passo ainda.</p>
          )}
          <ul className="space-y-2">
            {passos.map((p, i) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <span className="w-6 text-center text-sm font-semibold text-slate-400">
                  {i + 1}
                </span>
                <input
                  value={p.texto}
                  onChange={(e) => editarPasso(p.id, { texto: e.target.value })}
                  className="min-w-[8rem] flex-1 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
                />
                <select
                  value={p.dependeDe ?? ''}
                  onChange={(e) => editarPasso(p.id, { dependeDe: e.target.value || null })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600"
                  title="Depende de"
                >
                  <option value="">— sem dependência —</option>
                  {passos
                    .filter((outro, j) => outro.id !== p.id && j < i)
                    .map((outro, j) => (
                      <option key={outro.id} value={outro.id}>
                        depende do passo {j + 1}
                      </option>
                    ))}
                </select>
                <div className="flex gap-1">
                  <BotaoIcone onClick={() => moverPasso(i, -1)} titulo="Subir">
                    ↑
                  </BotaoIcone>
                  <BotaoIcone onClick={() => moverPasso(i, 1)} titulo="Descer">
                    ↓
                  </BotaoIcone>
                  <BotaoIcone onClick={() => removerPasso(p.id)} titulo="Remover">
                    ✕
                  </BotaoIcone>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <input
              value={novoPasso}
              onChange={(e) => setNovoPasso(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarPasso()}
              placeholder="Descreva um passo e pressione Enter"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              onClick={adicionarPasso}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Adicionar
            </button>
          </div>
        </Campo>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={submeter}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {editando ? 'Salvar alterações' : 'Criar atividade'}
          </button>
        </div>
      </div>
    </div>
  )
}

function reindexar(passos: Passo[]): Passo[] {
  return passos.map((p, i) => ({ ...p, ordem: i + 1 }))
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{rotulo}</label>
      {children}
    </div>
  )
}

function BotaoToggle({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 ${
        ativo ? 'bg-slate-900 text-white' : 'text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

function BotaoIcone({
  onClick,
  titulo,
  children,
}: {
  onClick: () => void
  titulo: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className="h-7 w-7 rounded border border-slate-300 text-slate-500 hover:bg-white"
    >
      {children}
    </button>
  )
}

function Slider({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string
  valor: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{rotulo}</span>
        <span className="font-semibold text-slate-800">{valor}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-900"
      />
    </div>
  )
}
