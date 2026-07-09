import { useState } from 'react'
import { PROVEDORES, useConfig, type ProvedorId } from '../../lib/config'
import { testarConexao } from '../../lib/ia'

export function ConfigPage() {
  const iaAtivada = useConfig((s) => s.iaAtivada)
  const provedor = useConfig((s) => s.provedor)
  const chaves = useConfig((s) => s.chaves)
  const modelos = useConfig((s) => s.modelos)
  const setIaAtivada = useConfig((s) => s.setIaAtivada)
  const setProvedor = useConfig((s) => s.setProvedor)
  const setChave = useConfig((s) => s.setChave)
  const setModelo = useConfig((s) => s.setModelo)

  const [teste, setTeste] = useState<{ estado: 'idle' | 'testando' | 'ok' | 'erro'; msg?: string }>({
    estado: 'idle',
  })

  const info = PROVEDORES.find((p) => p.id === provedor)!

  async function testar() {
    setTeste({ estado: 'testando' })
    const r = await testarConexao()
    setTeste(r.ok ? { estado: 'ok' } : { estado: 'erro', msg: r.erro })
  }

  function trocarProvedor(p: ProvedorId) {
    setProvedor(p)
    setTeste({ estado: 'idle' })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Configurações</h1>
      <p className="mb-6 text-slate-500">
        Recursos de IA são opcionais. Ficam desligados até você ativar aqui.
      </p>

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={iaAtivada}
            onChange={(e) => setIaAtivada(e.target.checked)}
            className="mt-1 h-4 w-4 accent-slate-900"
          />
          <span>
            <span className="font-medium text-slate-800">Ativar recursos de IA</span>
            <span className="block text-sm text-slate-500">
              Habilita sugestão de passos, sugestão de notas de criticidade e geração de relatório.
            </span>
          </span>
        </label>

        {iaAtivada && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ Ao usar a IA, o título e a descrição da atividade são enviados para o provedor
            escolhido (serviço externo). Não ative se os dados não puderem sair da empresa.
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Provedor de IA</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PROVEDORES.map((p) => (
              <button
                key={p.id}
                onClick={() => trocarProvedor(p.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  provedor === p.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Chave de API — {info.nome}
          </label>
          <input
            type="password"
            value={chaves[provedor]}
            onChange={(e) => setChave(provedor, e.target.value)}
            placeholder="Cole sua chave aqui"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            Guardada apenas neste navegador. Obtenha em{' '}
            <a
              href={info.urlChave}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-600"
            >
              {new URL(info.urlChave).host}
            </a>
            .
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Modelo</label>
          <input
            list={`modelos-${provedor}`}
            value={modelos[provedor]}
            onChange={(e) => setModelo(provedor, e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <datalist id={`modelos-${provedor}`}>
            {info.sugestoesModelo.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-400">
            Digite o nome do modelo que sua chave tem acesso (sugestões ao clicar).
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={testar}
            disabled={teste.estado === 'testando' || !chaves[provedor].trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {teste.estado === 'testando' ? 'Testando…' : `Testar conexão (${info.nome})`}
          </button>
          {teste.estado === 'ok' && (
            <span className="ml-3 text-sm font-medium text-emerald-600">
              ✓ Conexão funcionando — a IA está disponível nesta máquina.
            </span>
          )}
          {teste.estado === 'erro' && <p className="mt-2 text-sm text-red-600">✕ {teste.msg}</p>}
        </div>
      </div>
    </div>
  )
}
