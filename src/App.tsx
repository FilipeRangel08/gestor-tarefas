import { useEffect, useState } from 'react'
import {
  diagnosticarPersistencia,
  type DiagnosticoPersistencia,
} from './lib/persistence'

export default function App() {
  const [diag, setDiag] = useState<DiagnosticoPersistencia | null>(null)

  useEffect(() => {
    diagnosticarPersistencia().then(setDiag)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Gestor de Tarefas</h1>
          <p className="text-slate-500">
            Passo 1 — verificação de ambiente. Abra esta página no PC da empresa
            para descobrir como o app conseguirá salvar seus dados.
          </p>
        </header>

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
              <p className="mt-1 text-sm text-emerald-800">
                {diag.camadaAtiva.descricao}
              </p>
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
                    <span
                      className={
                        c.disponivel ? 'text-emerald-600' : 'text-slate-300'
                      }
                      aria-hidden
                    >
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
                <Info
                  rotulo="Navegador"
                  valor={diag.contexto.navegador}
                  quebra
                />
              </dl>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Info({
  rotulo,
  valor,
  quebra,
}: {
  rotulo: string
  valor: string
  quebra?: boolean
}) {
  return (
    <div className={quebra ? 'sm:col-span-2' : ''}>
      <dt className="text-slate-400">{rotulo}</dt>
      <dd className="break-words font-medium text-slate-700">{valor}</dd>
    </div>
  )
}
