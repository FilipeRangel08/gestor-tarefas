// Fábricas para criar entidades com defaults e ids. Concentram o uso de
// crypto.randomUUID() e do relógio, mantendo o resto do domínio puro.

import { agoraISO } from '../lib/datas'
import { deriveStatus } from './rules'
import type {
  Atividade,
  Criticidade,
  ModoCriticidade,
  NotasQuestionario,
  Passo,
  RegistroHistorico,
  StatusAtividade,
} from './types'

export function novoId(): string {
  return crypto.randomUUID()
}

export function criarPasso(texto: string, ordem: number, dependeDe: string | null = null): Passo {
  return {
    id: novoId(),
    texto,
    ordem,
    dependeDe,
    concluido: false,
    tempoGastoMin: null,
    observacao: '',
  }
}

export interface DadosAtividade {
  titulo: string
  descricao: string
  prazo: string | null
  criticidade: Criticidade
  modoCriticidade: ModoCriticidade
  notasQuestionario: NotasQuestionario | null
  passos: Passo[]
}

export function criarAtividade(dados: DadosAtividade): Atividade {
  const base: Atividade = {
    id: novoId(),
    titulo: dados.titulo.trim(),
    descricao: dados.descricao.trim(),
    criticidade: dados.criticidade,
    modoCriticidade: dados.modoCriticidade,
    notasQuestionario: dados.notasQuestionario,
    prazo: dados.prazo,
    status: 'Não iniciada',
    concluidaManualmente: false,
    criadaEm: agoraISO(),
    concluidaEm: null,
    passos: dados.passos,
  }
  base.status = deriveStatus(base)
  return base
}

/** Cria um registro imutável de histórico a partir do estado atual. */
export function criarRegistroHistorico(
  atividade: Atividade,
  de: StatusAtividade | null,
  para: StatusAtividade,
): RegistroHistorico {
  return {
    id: novoId(),
    atividadeId: atividade.id,
    titulo: atividade.titulo,
    de,
    para,
    em: agoraISO(),
    tempoTotalMin: atividade.passos.reduce((s, p) => s + (p.tempoGastoMin ?? 0), 0),
    criticidade: atividade.criticidade,
    snapshotPassos: atividade.passos.map((p) => ({
      texto: p.texto,
      concluido: p.concluido,
      observacao: p.observacao,
      tempoGastoMin: p.tempoGastoMin,
    })),
  }
}
