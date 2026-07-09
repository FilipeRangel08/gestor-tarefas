import { useState } from 'react'
import { MODELOS, useConfig } from '../../lib/config'
import { testarConexao } from '../../lib/ia'

export function ConfigPage() {
  const iaAtivada = useConfig((s) => s.iaAtivada)
  const apiKey = useConfig((s) => s.apiKey)
  const modelo = useConfig((s) => s.modelo)
  const atualizar = useConfig((s) => s.atualizar)

  const [teste, setTeste] = useState<{ estado: 'idle' | 'testando' | 'ok' | 'erro'; msg?: string }>({
    estado: 'idle',
  })

  async function testar() {
    setTeste({ estado: 'testando' })
    const r = await testarConexao()
    setTeste(r.ok ? { estado: 'ok' } : { estado: 'erro', msg: r.erro })
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
            onChange={(e) => atualizar({ iaAtivada: e.target.checked })}
            className="mt-1 h-4 w-4 accent-slate-900"
          />
          <span>
            <span className="font-medium text-slate-800">Ativar recursos de IA</span>
            <span className="block text-sm text-slate-500">
              Habilita sugestão de passos, sugestão de notas de criticidade e geração de
              relatório.
            </span>
          </span>
        </label>

        {iaAtivada && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ Ao usar a IA, o título e a descrição da atividade são enviados para a API da
            Anthropic (serviço externo). Não ative se os dados não puderem sair da empresa.
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Chave de API da Anthropic
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => atualizar({ apiKey: e.target.value })}
            placeholder="sk-ant-..."
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            Guardada apenas neste navegador. Nunca é enviada para lugar nenhum além da
            própria API da Anthropic.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Modelo</label>
          <select
            value={modelo}
            onChange={(e) => atualizar({ modelo: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {MODELOS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={testar}
            disabled={teste.estado === 'testando' || !apiKey.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {teste.estado === 'testando' ? 'Testando…' : 'Testar conexão'}
          </button>
          {teste.estado === 'ok' && (
            <span className="ml-3 text-sm font-medium text-emerald-600">
              ✓ Conexão funcionando — a IA está disponível nesta máquina.
            </span>
          )}
          {teste.estado === 'erro' && (
            <p className="mt-2 text-sm text-red-600">✕ {teste.msg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
