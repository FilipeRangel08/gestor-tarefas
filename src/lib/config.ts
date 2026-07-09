// Configuração da IA (opcional, multi-provedor).
// Persistida em localStorage, separada dos dados das atividades.
// A IA vem DESLIGADA por padrão (§14 do PLANO.md).

import { create } from 'zustand'

const CHAVE = 'app.config.v1'

export type ProvedorId = 'anthropic' | 'openai' | 'gemini'

export interface Provedor {
  id: ProvedorId
  nome: string
  modeloPadrao: string
  /** Sugestões de modelo mostradas no datalist (o usuário pode digitar outro). */
  sugestoesModelo: string[]
  /** Onde obter a chave de API. */
  urlChave: string
}

export const PROVEDORES: Provedor[] = [
  {
    id: 'anthropic',
    nome: 'Anthropic (Claude)',
    modeloPadrao: 'claude-opus-4-8',
    sugestoesModelo: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'],
    urlChave: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    nome: 'OpenAI (GPT)',
    modeloPadrao: 'gpt-4o',
    sugestoesModelo: ['gpt-4o', 'gpt-4o-mini'],
    urlChave: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    nome: 'Google (Gemini)',
    modeloPadrao: 'gemini-2.0-flash',
    sugestoesModelo: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    urlChave: 'https://aistudio.google.com/apikey',
  },
]

export interface ConfigIA {
  /** Liga/desliga a IA. Desligada por padrão. */
  iaAtivada: boolean
  /** Provedor ativo. */
  provedor: ProvedorId
  /** Chave de API por provedor (só ficam locais). */
  chaves: Record<ProvedorId, string>
  /** Modelo escolhido por provedor. */
  modelos: Record<ProvedorId, string>
}

function padrao(): ConfigIA {
  return {
    iaAtivada: false,
    provedor: 'anthropic',
    chaves: { anthropic: '', openai: '', gemini: '' },
    modelos: Object.fromEntries(
      PROVEDORES.map((p) => [p.id, p.modeloPadrao]),
    ) as Record<ProvedorId, string>,
  }
}

function ler(): ConfigIA {
  const base = padrao()
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return base
    const dados = JSON.parse(bruto) as Record<string, unknown>

    // Migração da versão antiga (single-provider): { apiKey, modelo }.
    if ('apiKey' in dados || 'modelo' in dados) {
      base.iaAtivada = Boolean(dados.iaAtivada)
      base.provedor = 'anthropic'
      base.chaves.anthropic = String(dados.apiKey ?? '')
      base.modelos.anthropic = String(dados.modelo ?? base.modelos.anthropic)
      return base
    }

    return {
      iaAtivada: Boolean(dados.iaAtivada),
      provedor: (dados.provedor as ProvedorId) ?? base.provedor,
      chaves: { ...base.chaves, ...((dados.chaves as object) ?? {}) },
      modelos: { ...base.modelos, ...((dados.modelos as object) ?? {}) },
    }
  } catch {
    return base
  }
}

interface EstadoConfig extends ConfigIA {
  setIaAtivada: (v: boolean) => void
  setProvedor: (p: ProvedorId) => void
  setChave: (p: ProvedorId, valor: string) => void
  setModelo: (p: ProvedorId, valor: string) => void
}

export const useConfig = create<EstadoConfig>((set, get) => {
  function persistir(next: ConfigIA) {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({
        iaAtivada: next.iaAtivada,
        provedor: next.provedor,
        chaves: next.chaves,
        modelos: next.modelos,
      }),
    )
  }

  function atual(): ConfigIA {
    const s = get()
    return { iaAtivada: s.iaAtivada, provedor: s.provedor, chaves: s.chaves, modelos: s.modelos }
  }

  return {
    ...ler(),
    setIaAtivada(v) {
      const next = { ...atual(), iaAtivada: v }
      persistir(next)
      set({ iaAtivada: v })
    },
    setProvedor(p) {
      const next = { ...atual(), provedor: p }
      persistir(next)
      set({ provedor: p })
    },
    setChave(p, valor) {
      const chaves = { ...get().chaves, [p]: valor }
      persistir({ ...atual(), chaves })
      set({ chaves })
    },
    setModelo(p, valor) {
      const modelos = { ...get().modelos, [p]: valor }
      persistir({ ...atual(), modelos })
      set({ modelos })
    },
  }
})
