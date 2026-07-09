import { useEffect, useState } from 'react'
import {
  diagnosticarPersistencia,
  type DiagnosticoPersistencia,
} from '../../lib/persistence'

export function DiagnosticoPage() {
  const [diag, setDiag] = useState<DiagnosticoPersistencia | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [falhouCopia, setFalhouCopia] = useState(false)

  useEffect(() => {
    diagnosticarPersistencia().then(setDiag)
  }, [])

  async function copiar() {
    if (!diag) return
    const texto = montarResumo(diag)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setFalhouCopia(false)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Clipboard pode estar bloqueado por política; mostra o texto para
      // seleção manual.
      setFalhouCopia(true)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Diagnóstico de ambiente</h1>
          <p className="text-slate-500">
            Abra esta página no PC da empresa para descobrir como o app conseguirá
            salvar seus dados.
          </p>
        </div>
        {diag && (
          <button
            onClick={copiar}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {copiado ? '✓ Copiado!' : 'Copiar diagnóstico'}
          </button>
        )}
      </header>

      {falhouCopia && diag && (
        <div className="mb-6">
          <p className="mb-1 text-sm text-slate-500">
            Não consegui copiar automaticamente. Selecione o texto abaixo e copie
            (Ctrl+C):
          </p>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
            {montarResumo(diag)}
          </pre>
        </div>
      )}

      {!diag ? (
        <p className="text-slate-500">Verificando ambiente…</p>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">
              Camada de persistência que será usada
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-900">
              {diag.camadaAtiva.nome}
            </p>
            <p className="mt-1 text-sm text-emerald-800">{diag.camadaAtiva.descricao}</p>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Camadas testadas
            </h2>
            <ul className="space-y-2">
              {diag.camadas.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <span className={c.disponivel ? 'text-emerald-600' : 'text-slate-300'} aria-hidden>
                    {c.disponivel ? '✓' : '✕'}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{c.nome}</p>
                    <p className="text-sm text-slate-500">{c.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Contexto do ambiente
            </h2>
            <dl className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
              <Info rotulo="Protocolo" valor={diag.contexto.protocolo} />
              <Info
                rotulo="Armazenamento persistente"
                valor={
                  diag.contexto.armazenamentoPersistente === null
                    ? 'desconhecido'
                    : diag.contexto.armazenamentoPersistente
                      ? 'concedido'
                      : 'não concedido'
                }
              />
              <Info
                rotulo="crossOriginIsolated"
                valor={String(diag.contexto.crossOriginIsolated)}
              />
              <Info rotulo="Navegador" valor={diag.contexto.navegador} quebra />
            </dl>
          </section>
        </>
      )}
    </div>
  )
}

/** Monta um resumo em texto plano do diagnóstico, para colar de volta. */
function montarResumo(diag: DiagnosticoPersistencia): string {
  const linhas = [
    'Gestor de Tarefas — Diagnóstico de ambiente',
    `Camada ativa: ${diag.camadaAtiva.nome}`,
    '',
    'Camadas testadas:',
    ...diag.camadas.map((c) => `  [${c.disponivel ? 'x' : ' '}] ${c.nome}`),
    '',
    `Protocolo: ${diag.contexto.protocolo}`,
    `Armazenamento persistente: ${
      diag.contexto.armazenamentoPersistente === null
        ? 'desconhecido'
        : diag.contexto.armazenamentoPersistente
          ? 'concedido'
          : 'não concedido'
    }`,
    `crossOriginIsolated: ${diag.contexto.crossOriginIsolated}`,
    `Navegador: ${diag.contexto.navegador}`,
  ]
  return linhas.join('\n')
}

function Info({ rotulo, valor, quebra }: { rotulo: string; valor: string; quebra?: boolean }) {
  return (
    <div className={quebra ? 'sm:col-span-2' : ''}>
      <dt className="text-slate-400">{rotulo}</dt>
      <dd className="break-words font-medium text-slate-700">{valor}</dd>
    </div>
  )
}
