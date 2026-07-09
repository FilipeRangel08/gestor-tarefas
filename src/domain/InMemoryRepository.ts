// Implementação em memória do TarefaRepository.
// Serve para desenvolver a UI e rodar testes hoje, sem depender de qual camada
// de persistência (SQLite/arquivo, OPFS, IndexedDB) vencer o teste de ambiente.
// Depois é substituída pela implementação de SQLite, mantendo a mesma interface.

import type { TarefaRepository } from './repository'
import type { Atividade, RegistroHistorico } from './types'

export class InMemoryRepository implements TarefaRepository {
  private atividades: Map<string, Atividade>
  private historico: RegistroHistorico[]

  constructor(seed: { atividades?: Atividade[]; historico?: RegistroHistorico[] } = {}) {
    this.atividades = new Map((seed.atividades ?? []).map((a) => [a.id, a]))
    this.historico = [...(seed.historico ?? [])]
  }

  async listarAtividades(): Promise<Atividade[]> {
    return clone([...this.atividades.values()])
  }

  async obterAtividade(id: string): Promise<Atividade | null> {
    const a = this.atividades.get(id)
    return a ? clone(a) : null
  }

  async salvarAtividade(atividade: Atividade): Promise<void> {
    this.atividades.set(atividade.id, clone(atividade))
  }

  async excluirAtividade(id: string): Promise<void> {
    this.atividades.delete(id)
  }

  async listarHistorico(): Promise<RegistroHistorico[]> {
    return clone(this.historico)
  }

  async registrarHistorico(registro: RegistroHistorico): Promise<void> {
    this.historico.push(clone(registro))
  }
}

// Cópia defensiva: o repositório nunca devolve referências ao seu estado
// interno, evitando mutação acidental de fora (mesmo contrato de um banco real).
function clone<T>(valor: T): T {
  return structuredClone(valor)
}
