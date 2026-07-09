// Modelo de dados do app (ver §2 do PLANO.md).
// Tipos puros, sem dependência de UI ou persistência.

export type Criticidade = 'Baixa' | 'Média' | 'Alta' | 'Urgente'

export type StatusAtividade = 'Não iniciada' | 'Em andamento' | 'Concluída'

export type ModoCriticidade = 'Manual' | 'Questionario'

/** Notas de 1 a 5 do questionário de criticidade (§3). */
export interface NotasQuestionario {
  urgencia: number
  impacto: number
  dependencia: number
}

export interface Passo {
  id: string
  texto: string
  /** Posição na lista (1, 2, 3...). */
  ordem: number
  /** id de outro passo da mesma atividade, ou null. */
  dependeDe: string | null
  concluido: boolean
  /** Minutos, preenchido ao concluir. */
  tempoGastoMin: number | null
  observacao: string
}

export interface Atividade {
  id: string
  titulo: string
  descricao: string
  criticidade: Criticidade
  modoCriticidade: ModoCriticidade
  /** Guardado quando o modo é Questionario, para reabrir e reajustar. */
  notasQuestionario: NotasQuestionario | null
  /** Data ISO (YYYY-MM-DD) ou null. */
  prazo: string | null
  status: StatusAtividade
  /** Permite concluir uma atividade sem passos (§13). */
  concluidaManualmente: boolean
  criadaEm: string
  concluidaEm: string | null
  passos: Passo[]
}

/** Snapshot imutável gerado a cada mudança de status (§2). */
export interface RegistroHistorico {
  id: string
  atividadeId: string
  titulo: string
  de: StatusAtividade | null
  para: StatusAtividade
  em: string
  tempoTotalMin: number
  criticidade: Criticidade
  snapshotPassos: {
    texto: string
    concluido: boolean
    observacao: string
    tempoGastoMin: number | null
  }[]
}
