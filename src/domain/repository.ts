// Contrato de acesso a dados (§10). A UI e o store falam APENAS com esta
// interface. Trocar SQLite/arquivo por OPFS, IndexedDB ou Supabase no futuro
// = nova implementação, sem tocar no resto do app.

import type { Atividade, RegistroHistorico } from './types'

export interface TarefaRepository {
  listarAtividades(): Promise<Atividade[]>
  obterAtividade(id: string): Promise<Atividade | null>
  salvarAtividade(atividade: Atividade): Promise<void>
  excluirAtividade(id: string): Promise<void>

  listarHistorico(): Promise<RegistroHistorico[]>
  /** Histórico é imutável: só é possível acrescentar registros (§2). */
  registrarHistorico(registro: RegistroHistorico): Promise<void>
}
