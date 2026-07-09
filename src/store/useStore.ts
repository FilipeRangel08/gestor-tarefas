// Store global (Zustand). É a única ponte entre a UI e o repositório.
// Concentra os efeitos de negócio: recalcular status, marcar data de conclusão
// e registrar histórico a cada transição (§13).

import { create } from 'zustand'
import { agoraISO } from '../lib/datas'
import { LocalStorageRepository } from '../domain/LocalStorageRepository'
import { criarRegistroHistorico, type DadosAtividade, criarAtividade } from '../domain/factory'
import { deriveStatus } from '../domain/rules'
import type { TarefaRepository } from '../domain/repository'
import type { Atividade, RegistroHistorico } from '../domain/types'

// Persistência do MVP. Trocar aqui (ex.: SqliteRepository) não afeta a UI.
const repo: TarefaRepository = new LocalStorageRepository('app.tarefas.v1')

interface EstadoApp {
  carregado: boolean
  atividades: Atividade[]
  historico: RegistroHistorico[]

  carregar: () => Promise<void>
  criar: (dados: DadosAtividade) => Promise<Atividade>
  /** Substitui uma atividade existente pelo objeto já modificado. */
  salvar: (atividade: Atividade) => Promise<void>
  excluir: (id: string) => Promise<void>
}

/**
 * Aplica os efeitos de uma alteração e persiste: recalcula o status derivado,
 * ajusta concluidaEm e grava um registro de histórico se o status mudou.
 * Retorna a atividade já com o status atualizado.
 */
async function persistirComEfeitos(
  atividade: Atividade,
  statusAnterior: Atividade['status'] | null,
): Promise<Atividade> {
  const novoStatus = deriveStatus(atividade)
  const atualizada: Atividade = {
    ...atividade,
    status: novoStatus,
    concluidaEm:
      novoStatus === 'Concluída' ? (atividade.concluidaEm ?? agoraISO()) : null,
  }

  await repo.salvarAtividade(atualizada)

  if (statusAnterior !== novoStatus) {
    await repo.registrarHistorico(
      criarRegistroHistorico(atualizada, statusAnterior, novoStatus),
    )
  }
  return atualizada
}

export const useStore = create<EstadoApp>((set, get) => ({
  carregado: false,
  atividades: [],
  historico: [],

  async carregar() {
    const [atividades, historico] = await Promise.all([
      repo.listarAtividades(),
      repo.listarHistorico(),
    ])
    set({ atividades, historico, carregado: true })
  },

  async criar(dados) {
    const nova = criarAtividade(dados)
    await persistirComEfeitos(nova, null)
    await get().carregar()
    return nova
  },

  async salvar(atividade) {
    const anterior = get().atividades.find((a) => a.id === atividade.id)
    await persistirComEfeitos(atividade, anterior?.status ?? null)
    await get().carregar()
  },

  async excluir(id) {
    await repo.excluirAtividade(id)
    await get().carregar()
  },
}))
