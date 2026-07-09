import { describe, it, expect } from 'vitest'
import {
  classificarCriticidade,
  compararDashboard,
  deriveStatus,
  estaAtrasada,
  podeConcluirPasso,
  progressoAtividade,
  progressoGeral,
  temCicloDependencias,
  tempoTotalMin,
} from './rules'
import type { Atividade, Criticidade, Passo } from './types'

// -------- helpers de fixture --------

let contador = 0
function id(prefixo = 'x'): string {
  contador += 1
  return `${prefixo}-${contador}`
}

function passo(over: Partial<Passo> = {}): Passo {
  return {
    id: id('p'),
    texto: 'passo',
    ordem: 1,
    dependeDe: null,
    concluido: false,
    tempoGastoMin: null,
    observacao: '',
    ...over,
  }
}

function atividade(over: Partial<Atividade> = {}): Atividade {
  return {
    id: id('a'),
    titulo: 'Atividade',
    descricao: '',
    criticidade: 'Média',
    modoCriticidade: 'Manual',
    notasQuestionario: null,
    prazo: null,
    status: 'Não iniciada',
    concluidaManualmente: false,
    criadaEm: '2026-01-01T00:00:00Z',
    concluidaEm: null,
    passos: [],
    ...over,
  }
}

// -------- criticidade por questionário (§3) --------

describe('classificarCriticidade', () => {
  const casos: [number, number, number, Criticidade][] = [
    [1, 1, 1, 'Baixa'], // média 1.0
    [2, 2, 2, 'Baixa'], // média 2.0 (limite superior de Baixa)
    [3, 2, 2, 'Média'], // média ~2.33
    [3, 3, 3, 'Média'], // média 3.0 (limite superior de Média)
    [4, 4, 3, 'Alta'], // média ~3.67
    [4, 4, 4, 'Alta'], // média 4.0 (limite superior de Alta)
    [5, 4, 4, 'Urgente'], // média ~4.33
    [5, 5, 5, 'Urgente'], // média 5.0
  ]
  it.each(casos)('urg=%i imp=%i dep=%i => %s', (urgencia, impacto, dependencia, esperado) => {
    expect(classificarCriticidade({ urgencia, impacto, dependencia })).toBe(esperado)
  })
})

// -------- progresso por atividade (§5) --------

describe('progressoAtividade', () => {
  it('sem passos = 0', () => {
    expect(progressoAtividade(atividade())).toBe(0)
  })
  it('5 de 7 passos ≈ 0,714', () => {
    const passos = Array.from({ length: 7 }, (_, i) => passo({ concluido: i < 5 }))
    expect(progressoAtividade(atividade({ passos }))).toBeCloseTo(5 / 7, 5)
  })
  it('todos concluídos = 1', () => {
    const passos = [passo({ concluido: true }), passo({ concluido: true })]
    expect(progressoAtividade(atividade({ passos }))).toBe(1)
  })
})

// -------- progresso geral ponderado (§5) --------

describe('progressoGeral', () => {
  it('sem atividades pendentes = 1', () => {
    expect(progressoGeral([])).toBe(1)
  })

  it('atividades concluídas são ignoradas', () => {
    const concluida = atividade({
      criticidade: 'Urgente',
      passos: [passo({ concluido: true })],
    })
    const pendente = atividade({
      criticidade: 'Baixa',
      passos: [passo({ concluido: false }), passo({ concluido: true })],
    })
    // só a pendente conta: progresso 0,5
    expect(progressoGeral([concluida, pendente])).toBeCloseTo(0.5, 5)
  })

  it('urgente pesa mais que baixa (ambas pendentes)', () => {
    // Urgente(peso5) a 0%; Baixa(peso1) a 75% (3 de 4 passos — ainda pendente).
    const urgente = atividade({ criticidade: 'Urgente', passos: [passo({ concluido: false })] })
    const baixa = atividade({
      criticidade: 'Baixa',
      passos: Array.from({ length: 4 }, (_, i) => passo({ concluido: i < 3 })),
    })
    // (5*0 + 1*0,75) / (5+1) = 0,125 — bem abaixo da média simples (37,5%),
    // porque a urgente (0%) tem peso 5.
    expect(progressoGeral([urgente, baixa])).toBeCloseTo(0.125, 5)
  })
})

// -------- status derivado (§13) --------

describe('deriveStatus', () => {
  it('sem passos e sem conclusão manual = Não iniciada', () => {
    expect(deriveStatus(atividade())).toBe('Não iniciada')
  })
  it('sem passos mas concluída manualmente = Concluída', () => {
    expect(deriveStatus(atividade({ concluidaManualmente: true }))).toBe('Concluída')
  })
  it('nenhum passo concluído = Não iniciada', () => {
    expect(deriveStatus(atividade({ passos: [passo(), passo()] }))).toBe('Não iniciada')
  })
  it('alguns concluídos = Em andamento', () => {
    expect(
      deriveStatus(atividade({ passos: [passo({ concluido: true }), passo()] })),
    ).toBe('Em andamento')
  })
  it('todos concluídos = Concluída', () => {
    expect(
      deriveStatus(atividade({ passos: [passo({ concluido: true })] })),
    ).toBe('Concluída')
  })
})

describe('tempoTotalMin', () => {
  it('soma os tempos, tratando null como 0', () => {
    const passos = [
      passo({ tempoGastoMin: 30 }),
      passo({ tempoGastoMin: null }),
      passo({ tempoGastoMin: 15 }),
    ]
    expect(tempoTotalMin(atividade({ passos }))).toBe(45)
  })
})

// -------- dependências entre passos (§4) --------

describe('podeConcluirPasso', () => {
  it('passo sem dependência pode concluir', () => {
    const p = passo()
    expect(podeConcluirPasso(p.id, [p])).toBe(true)
  })
  it('bloqueado enquanto a dependência não estiver concluída', () => {
    const p1 = passo({ concluido: false })
    const p2 = passo({ dependeDe: p1.id })
    expect(podeConcluirPasso(p2.id, [p1, p2])).toBe(false)
  })
  it('liberado quando a dependência está concluída', () => {
    const p1 = passo({ concluido: true })
    const p2 = passo({ dependeDe: p1.id })
    expect(podeConcluirPasso(p2.id, [p1, p2])).toBe(true)
  })
})

describe('temCicloDependencias', () => {
  it('cadeia linear não tem ciclo', () => {
    const p1 = passo()
    const p2 = passo({ dependeDe: p1.id })
    const p3 = passo({ dependeDe: p2.id })
    expect(temCicloDependencias([p1, p2, p3])).toBe(false)
  })
  it('detecta ciclo direto (A→B→A)', () => {
    const a = passo({ id: 'A', dependeDe: 'B' })
    const b = passo({ id: 'B', dependeDe: 'A' })
    expect(temCicloDependencias([a, b])).toBe(true)
  })
  it('detecta autodependência (A→A)', () => {
    const a = passo({ id: 'A', dependeDe: 'A' })
    expect(temCicloDependencias([a])).toBe(true)
  })
})

// -------- atraso (§9) e ordenação (§7) --------

describe('estaAtrasada', () => {
  const hoje = '2026-07-08'
  it('prazo no passado e não concluída = atrasada', () => {
    expect(estaAtrasada(atividade({ prazo: '2026-07-01' }), hoje)).toBe(true)
  })
  it('prazo no futuro não está atrasada', () => {
    expect(estaAtrasada(atividade({ prazo: '2026-07-20' }), hoje)).toBe(false)
  })
  it('concluída nunca está atrasada', () => {
    const a = atividade({ prazo: '2026-07-01', passos: [passo({ concluido: true })] })
    expect(estaAtrasada(a, hoje)).toBe(false)
  })
  it('sem prazo não está atrasada', () => {
    expect(estaAtrasada(atividade(), hoje)).toBe(false)
  })
})

describe('compararDashboard', () => {
  const hoje = '2026-07-08'
  it('atrasada vem antes de não-atrasada, mesmo com criticidade menor', () => {
    const atrasadaBaixa = atividade({ criticidade: 'Baixa', prazo: '2026-07-01' })
    const noPrazoUrgente = atividade({ criticidade: 'Urgente', prazo: '2026-07-20' })
    expect(compararDashboard(atrasadaBaixa, noPrazoUrgente, hoje)).toBeLessThan(0)
  })
  it('sem atraso, maior criticidade primeiro', () => {
    const urgente = atividade({ criticidade: 'Urgente', prazo: '2026-07-20' })
    const media = atividade({ criticidade: 'Média', prazo: '2026-07-20' })
    expect(compararDashboard(urgente, media, hoje)).toBeLessThan(0)
  })
  it('mesma criticidade, prazo mais próximo primeiro', () => {
    const cedo = atividade({ criticidade: 'Alta', prazo: '2026-07-10' })
    const tarde = atividade({ criticidade: 'Alta', prazo: '2026-07-25' })
    expect(compararDashboard(cedo, tarde, hoje)).toBeLessThan(0)
  })
  it('ordena uma lista completa de forma estável', () => {
    const lista = [
      atividade({ titulo: 'no prazo média', criticidade: 'Média', prazo: '2026-07-20' }),
      atividade({ titulo: 'atrasada baixa', criticidade: 'Baixa', prazo: '2026-07-01' }),
      atividade({ titulo: 'no prazo urgente', criticidade: 'Urgente', prazo: '2026-07-20' }),
    ]
    const ordenada = lista.slice().sort((a, b) => compararDashboard(a, b, hoje)).map((a) => a.titulo)
    expect(ordenada).toEqual(['atrasada baixa', 'no prazo urgente', 'no prazo média'])
  })
})
