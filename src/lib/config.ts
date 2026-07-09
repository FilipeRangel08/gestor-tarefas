// Configuração da IA (opcional). Persistida em localStorage, separada dos dados
// das atividades. A IA vem DESLIGADA por padrão (§14 do PLANO.md).

import { create } from 'zustand'

const CHAVE = 'app.config.v1'

export interface ConfigIA {
  /** Liga/desliga a IA. Desligada por padrão. */
  iaAtivada: boolean
  /** Chave de API da Anthropic, fornecida pelo usuário. Só fica local. */
  apiKey: string
  /** Modelo Claude usado nas chamadas. */
  modelo: string
}

export const MODELOS: { id: string; nome: string }[] = [
  { id: 'claude-opus-4-8', nome: 'Claude Opus 4.8 (mais capaz)' },
  { id: 'claude-sonnet-5', nome: 'Claude Sonnet 5 (equilibrado, mais barato)' },
  { id: 'claude-haiku-4-5', nome: 'Claude Haiku 4.5 (mais rápido e econômico)' },
]

const PADRAO: ConfigIA = {
  iaAtivada: false,
  apiKey: '',
  modelo: 'claude-opus-4-8',
}

function ler(): ConfigIA {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<ConfigIA>) } : PADRAO
  } catch {
    return PADRAO
  }
}

interface EstadoConfig extends ConfigIA {
  atualizar: (patch: Partial<ConfigIA>) => void
}

export const useConfig = create<EstadoConfig>((set, get) => ({
  ...ler(),
  atualizar(patch) {
    const next = { ...get(), ...patch }
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ iaAtivada: next.iaAtivada, apiKey: next.apiKey, modelo: next.modelo }),
    )
    set(patch)
  },
}))
