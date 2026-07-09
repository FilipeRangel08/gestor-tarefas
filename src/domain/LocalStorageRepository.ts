// Implementação do TarefaRepository sobre localStorage.
//
// Funciona em 100% dos navegadores (inclusive o do PC da empresa), sem depender
// do resultado do teste de ambiente. É a persistência do MVP; quando o SQLite
// em arquivo entrar, basta trocar por SqliteRepository — mesma interface (§10).

import type { TarefaRepository } from './repository'
import type { Atividade, RegistroHistorico } from './types'

interface Snapshot {
  atividades: Atividade[]
  historico: RegistroHistorico[]
}

export class LocalStorageRepository implements TarefaRepository {
  constructor(private readonly chave: string) {}

  private ler(): Snapshot {
    try {
      const bruto = localStorage.getItem(this.chave)
      if (!bruto) return { atividades: [], historico: [] }
      const dados = JSON.parse(bruto) as Partial<Snapshot>
      return {
        atividades: dados.atividades ?? [],
        historico: dados.historico ?? [],
      }
    } catch {
      // Dado corrompido não deve derrubar o app; começa vazio.
      return { atividades: [], historico: [] }
    }
  }

  private escrever(snap: Snapshot): void {
    localStorage.setItem(this.chave, JSON.stringify(snap))
  }

  async listarAtividades(): Promise<Atividade[]> {
    return this.ler().atividades
  }

  async obterAtividade(id: string): Promise<Atividade | null> {
    return this.ler().atividades.find((a) => a.id === id) ?? null
  }

  async salvarAtividade(atividade: Atividade): Promise<void> {
    const snap = this.ler()
    const i = snap.atividades.findIndex((a) => a.id === atividade.id)
    if (i >= 0) snap.atividades[i] = atividade
    else snap.atividades.push(atividade)
    this.escrever(snap)
  }

  async excluirAtividade(id: string): Promise<void> {
    const snap = this.ler()
    snap.atividades = snap.atividades.filter((a) => a.id !== id)
    this.escrever(snap)
  }

  async listarHistorico(): Promise<RegistroHistorico[]> {
    return this.ler().historico
  }

  async registrarHistorico(registro: RegistroHistorico): Promise<void> {
    const snap = this.ler()
    snap.historico.push(registro)
    this.escrever(snap)
  }
}
