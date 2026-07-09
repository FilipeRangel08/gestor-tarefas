// Regras de negócio puras (sem UI, sem persistência, sem relógio global).
// Funções que dependem de "hoje" recebem a data como parâmetro, para serem
// testáveis de forma determinística.
//
// Referências: §3 (criticidade/pesos), §4 (dependências), §5 (progresso),
// §7 (ordenação), §9 (atraso), §13 (status) do PLANO.md.

import type {
  Atividade,
  Criticidade,
  NotasQuestionario,
  Passo,
  StatusAtividade,
} from './types'

/** Pesos usados no progresso geral ponderado (§3/§5). */
export const PESOS_CRITICIDADE: Record<Criticidade, number> = {
  Baixa: 1,
  Média: 2,
  Alta: 3,
  Urgente: 5,
}

/** Ordinal para ordenação (Urgente no topo). */
export const ORDEM_CRITICIDADE: Record<Criticidade, number> = {
  Urgente: 4,
  Alta: 3,
  Média: 2,
  Baixa: 1,
}

// ---------------------------------------------------------------------------
// Criticidade por questionário (§3)
// ---------------------------------------------------------------------------

export function mediaNotas(notas: NotasQuestionario): number {
  return (notas.urgencia + notas.impacto + notas.dependencia) / 3
}

/** Converte a média das 3 notas na faixa de criticidade. */
export function classificarCriticidade(notas: NotasQuestionario): Criticidade {
  const media = mediaNotas(notas)
  if (media <= 2.0) return 'Baixa'
  if (media <= 3.0) return 'Média'
  if (media <= 4.0) return 'Alta'
  return 'Urgente'
}

// ---------------------------------------------------------------------------
// Progresso (§5)
// ---------------------------------------------------------------------------

/** % de conclusão de uma atividade, em [0, 1]. Sem passos = 0. */
export function progressoAtividade(atividade: Atividade): number {
  const total = atividade.passos.length
  if (total === 0) return 0
  const concluidos = atividade.passos.filter((p) => p.concluido).length
  return concluidos / total
}

/**
 * Progresso geral do dashboard: média ponderada pelos pesos de criticidade,
 * considerando apenas atividades NÃO concluídas. Sem pendentes = 1 (100%).
 */
export function progressoGeral(atividades: Atividade[]): number {
  const pendentes = atividades.filter((a) => deriveStatus(a) !== 'Concluída')
  if (pendentes.length === 0) return 1

  let somaPesos = 0
  let somaPonderada = 0
  for (const a of pendentes) {
    const peso = PESOS_CRITICIDADE[a.criticidade]
    somaPesos += peso
    somaPonderada += peso * progressoAtividade(a)
  }
  return somaPesos === 0 ? 0 : somaPonderada / somaPesos
}

// ---------------------------------------------------------------------------
// Status derivado dos passos (§13)
// ---------------------------------------------------------------------------

export function deriveStatus(atividade: Atividade): StatusAtividade {
  if (atividade.passos.length === 0) {
    return atividade.concluidaManualmente ? 'Concluída' : 'Não iniciada'
  }
  const concluidos = atividade.passos.filter((p) => p.concluido).length
  if (concluidos === 0) return 'Não iniciada'
  if (concluidos === atividade.passos.length) return 'Concluída'
  return 'Em andamento'
}

/** Soma dos tempos gastos nos passos, em minutos. */
export function tempoTotalMin(atividade: Atividade): number {
  return atividade.passos.reduce((soma, p) => soma + (p.tempoGastoMin ?? 0), 0)
}

// ---------------------------------------------------------------------------
// Dependências entre passos (§4)
// ---------------------------------------------------------------------------

/**
 * Um passo só pode ser concluído se a dependência (se houver) já estiver
 * concluída. Passo inexistente ou dependência ausente → pode concluir.
 */
export function podeConcluirPasso(passoId: string, passos: Passo[]): boolean {
  const passo = passos.find((p) => p.id === passoId)
  if (!passo || passo.dependeDe == null) return true
  const dep = passos.find((p) => p.id === passo.dependeDe)
  // Dependência apontando para passo inexistente: não bloqueia.
  return dep ? dep.concluido : true
}

/**
 * Detecta se o grafo de dependências tem ciclo (A→B→...→A).
 * Retorna true se houver qualquer ciclo.
 */
export function temCicloDependencias(passos: Passo[]): boolean {
  const porId = new Map(passos.map((p) => [p.id, p]))
  const EM_VISITA = 1
  const VISITADO = 2
  const estado = new Map<string, number>()

  function visita(id: string): boolean {
    const atual = estado.get(id)
    if (atual === EM_VISITA) return true // voltou a um nó em aberto = ciclo
    if (atual === VISITADO) return false
    estado.set(id, EM_VISITA)
    const passo = porId.get(id)
    if (passo?.dependeDe != null && porId.has(passo.dependeDe)) {
      if (visita(passo.dependeDe)) return true
    }
    estado.set(id, VISITADO)
    return false
  }

  return passos.some((p) => visita(p.id))
}

// ---------------------------------------------------------------------------
// Prazo / atraso (§9) e ordenação do dashboard (§7)
// ---------------------------------------------------------------------------

/** Atividade atrasada: tem prazo, já passou, e não está concluída. */
export function estaAtrasada(atividade: Atividade, hojeISO: string): boolean {
  if (!atividade.prazo) return false
  if (deriveStatus(atividade) === 'Concluída') return false
  return atividade.prazo < hojeISO
}

/**
 * Comparador para ordenar o dashboard (§7):
 * 1) atrasadas primeiro; 2) maior criticidade; 3) prazo mais próximo.
 * Uso: `atividades.slice().sort((a, b) => compararDashboard(a, b, hoje))`.
 */
export function compararDashboard(
  a: Atividade,
  b: Atividade,
  hojeISO: string,
): number {
  const atrasoA = estaAtrasada(a, hojeISO) ? 1 : 0
  const atrasoB = estaAtrasada(b, hojeISO) ? 1 : 0
  if (atrasoA !== atrasoB) return atrasoB - atrasoA

  const critA = ORDEM_CRITICIDADE[a.criticidade]
  const critB = ORDEM_CRITICIDADE[b.criticidade]
  if (critA !== critB) return critB - critA

  // Prazo mais próximo primeiro; sem prazo vai para o fim.
  if (a.prazo && b.prazo) return a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0
  if (a.prazo) return -1
  if (b.prazo) return 1
  return 0
}
