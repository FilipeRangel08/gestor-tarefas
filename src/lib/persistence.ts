// Detecção das camadas de persistência disponíveis no navegador.
//
// O objetivo é descobrir, EM RUNTIME no PC da empresa, qual estratégia de
// salvar o banco SQLite vai funcionar — sem depender de nenhuma suposição.
// Ver §10 do PLANO.md (persistência em 3 camadas).

export type CamadaId = 'fsa' | 'opfs' | 'indexeddb' | 'memoria'

export interface Capacidade {
  id: CamadaId
  nome: string
  disponivel: boolean
  descricao: string
}

export interface DiagnosticoPersistencia {
  /** Camada que o app usaria de fato (a melhor disponível). */
  camadaAtiva: Capacidade
  /** Todas as camadas testadas, na ordem de preferência. */
  camadas: Capacidade[]
  /** Contexto extra útil para diagnosticar o ambiente. */
  contexto: {
    navegador: string
    protocolo: string
    crossOriginIsolated: boolean
    armazenamentoPersistente: boolean | null
  }
}

function temFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'showOpenFilePicker' in window
  )
}

function temOPFS(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.getDirectory === 'function'
  )
}

function temIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Roda todos os testes de capacidade e devolve o diagnóstico completo.
 * Pergunta também se o navegador concede armazenamento persistente
 * (reduz a chance de a camada OPFS/IndexedDB ser limpa automaticamente).
 */
export async function diagnosticarPersistencia(): Promise<DiagnosticoPersistencia> {
  const camadas: Capacidade[] = [
    {
      id: 'fsa',
      nome: 'Arquivo no disco (File System Access API)',
      disponivel: temFileSystemAccess(),
      descricao:
        'Salva o banco .sqlite num arquivo real (ex.: OneDrive/drive de rede). Melhor caso: sobrevive a reset do navegador e o arquivo é seu.',
    },
    {
      id: 'opfs',
      nome: 'Navegador — OPFS',
      disponivel: temOPFS(),
      descricao:
        'Salva automático num sistema de arquivos privado do navegador. Você não precisa fazer nada; convém exportar backup de vez em quando.',
    },
    {
      id: 'indexeddb',
      nome: 'Navegador — IndexedDB',
      disponivel: temIndexedDB(),
      descricao:
        'Salva automático no armazenamento do navegador. Funciona em praticamente todo lugar; exportar backup é recomendado.',
    },
    {
      id: 'memoria',
      nome: 'Somente memória (sem salvar)',
      disponivel: true,
      descricao:
        'Último recurso: os dados vivem só enquanto a aba estiver aberta. Use Exportar antes de fechar.',
    },
  ]

  const camadaAtiva = camadas.find((c) => c.disponivel)!

  let armazenamentoPersistente: boolean | null = null
  try {
    if (navigator.storage?.persisted) {
      armazenamentoPersistente = await navigator.storage.persisted()
    }
  } catch {
    armazenamentoPersistente = null
  }

  return {
    camadaAtiva,
    camadas,
    contexto: {
      navegador: navigator.userAgent,
      protocolo: window.location.protocol,
      crossOriginIsolated: Boolean(window.crossOriginIsolated),
      armazenamentoPersistente,
    },
  }
}
