// Atividades de exemplo, para demonstrar o app num dashboard vazio.

import { criarPasso, type DadosAtividade } from './factory'

export function atividadesExemplo(): DadosAtividade[] {
  // "Corrigir bug no login" — passos encadeados (cada um depende do anterior).
  const p1 = criarPasso('Reproduzir o erro localmente', 1)
  const p2 = criarPasso('Identificar a causa no código', 2, p1.id)
  const p3 = criarPasso('Escrever a correção', 3, p2.id)
  const p4 = criarPasso('Testar a correção', 4, p3.id)
  const p5 = criarPasso('Fazer o deploy', 5, p4.id)
  // Marca os dois primeiros como concluídos, para o exemplo ter progresso.
  p1.concluido = true
  p1.tempoGastoMin = 30
  p2.concluido = true
  p2.tempoGastoMin = 45

  const bugLogin: DadosAtividade = {
    titulo: 'Corrigir bug no sistema de login',
    descricao: 'Usuários não conseguem entrar após a última atualização.',
    prazo: '2026-07-12',
    criticidade: 'Urgente',
    modoCriticidade: 'Questionario',
    notasQuestionario: { urgencia: 5, impacto: 5, dependencia: 4 },
    passos: [p1, p2, p3, p4, p5],
  }

  const relatorio: DadosAtividade = {
    titulo: 'Preparar relatório mensal de manutenção',
    descricao: 'Consolidar indicadores do mês para apresentar à gerência.',
    prazo: '2026-07-25',
    criticidade: 'Média',
    modoCriticidade: 'Manual',
    notasQuestionario: null,
    passos: [
      criarPasso('Levantar dados dos apontamentos', 1),
      criarPasso('Montar tabelas e gráficos', 2),
      criarPasso('Escrever conclusões', 3),
    ],
  }

  return [bugLogin, relatorio]
}
