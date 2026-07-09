// Serviço de IA — isola todas as chamadas à API da Anthropic (§14 do PLANO.md).
//
// Roda direto do navegador com a chave do próprio usuário (dangerouslyAllowBrowser),
// o que é aceitável para uma ferramenta pessoal. Se um dia virar multiusuário,
// basta trocar esta camada por um proxy no backend — a UI não muda.

import Anthropic from '@anthropic-ai/sdk'
import { useConfig } from './config'
import {
  deriveStatus,
  progressoAtividade,
  tempoTotalMin,
} from '../domain/rules'
import { formatarDuracao, formatarPrazo } from './datas'
import type { Atividade, NotasQuestionario } from '../domain/types'

function cliente(): Anthropic {
  const { apiKey } = useConfig.getState()
  if (!apiKey.trim()) {
    throw new Error('Configure sua chave de API da Anthropic em Configurações.')
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/** Extrai o primeiro bloco de texto da resposta. */
function textoDe(resp: Anthropic.Message): string {
  const bloco = resp.content.find((b) => b.type === 'text')
  return bloco && bloco.type === 'text' ? bloco.text : ''
}

/** Extrai e faz parse do JSON retornado sob saída estruturada. */
function jsonDe<T>(resp: Anthropic.Message): T {
  return JSON.parse(textoDe(resp)) as T
}

/** Converte um erro do SDK numa mensagem amigável em português. */
export function mensagemErro(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Chave de API inválida.'
  if (e instanceof Anthropic.PermissionDeniedError) return 'A chave não tem permissão para este modelo.'
  if (e instanceof Anthropic.RateLimitError) return 'Limite de uso atingido. Tente novamente em instantes.'
  if (e instanceof Anthropic.APIConnectionError)
    return 'Não foi possível conectar à API (rede bloqueada, offline ou proxy). A IA pode estar indisponível nesta máquina.'
  if (e instanceof Anthropic.APIError) return `Erro da API (${e.status ?? '?'}): ${e.message}`
  return e instanceof Error ? e.message : 'Erro desconhecido.'
}

// ---------------------------------------------------------------------------
// Testar conexão (útil para validar a rede do PC da empresa)
// ---------------------------------------------------------------------------

export async function testarConexao(): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { modelo } = useConfig.getState()
    await cliente().messages.create(
      { model: modelo, max_tokens: 8, messages: [{ role: 'user', content: 'ok' }] },
      { timeout: 20000 },
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) }
  }
}

// ---------------------------------------------------------------------------
// Sugerir passos (§4)
// ---------------------------------------------------------------------------

export interface PassoSugerido {
  texto: string
  /** 0 = sem dependência; senão a ordem (1-based) do passo do qual depende. */
  dependeDeOrdem: number
}

const SCHEMA_PASSOS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    passos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          texto: { type: 'string' },
          dependeDeOrdem: {
            type: 'integer',
            description: '0 = sem dependência; senão a ordem (1-based) do passo anterior do qual este depende',
          },
        },
        required: ['texto', 'dependeDeOrdem'],
      },
    },
  },
  required: ['passos'],
} as const

export async function sugerirPassos(
  titulo: string,
  descricao: string,
): Promise<PassoSugerido[]> {
  const { modelo } = useConfig.getState()
  const prompt = `Você ajuda a dividir uma tarefa em passos práticos e ordenados.

Tarefa: "${titulo}"
Descrição: ${descricao || '(sem descrição)'}

Liste de 3 a 8 passos concretos, na ordem de execução. Quando um passo só puder
começar depois de outro estar pronto, informe a dependência pela ordem (1-based).
Responda em português.`

  const resp = await cliente().messages.create(
    {
      model: modelo,
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SCHEMA_PASSOS } },
      messages: [{ role: 'user', content: prompt }],
    } as Anthropic.MessageCreateParamsNonStreaming,
    { timeout: 30000 },
  )
  return jsonDe<{ passos: PassoSugerido[] }>(resp).passos
}

// ---------------------------------------------------------------------------
// Sugerir notas de criticidade (§3)
// ---------------------------------------------------------------------------

const NOTA = { type: 'integer', enum: [1, 2, 3, 4, 5] } as const

const SCHEMA_NOTAS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    urgencia: NOTA,
    impacto: NOTA,
    dependencia: NOTA,
  },
  required: ['urgencia', 'impacto', 'dependencia'],
} as const

export async function sugerirNotas(
  titulo: string,
  descricao: string,
): Promise<NotasQuestionario> {
  const { modelo } = useConfig.getState()
  const prompt = `Avalie a criticidade desta tarefa dando uma nota de 1 a 5 em cada critério.

Tarefa: "${titulo}"
Descrição: ${descricao || '(sem descrição)'}

Critérios (1 = baixo, 5 = máximo):
- urgencia: pressão do prazo
- impacto: consequência de não fazer
- dependencia: o quanto trava outras tarefas ou terceiros`

  const resp = await cliente().messages.create(
    {
      model: modelo,
      max_tokens: 256,
      output_config: { format: { type: 'json_schema', schema: SCHEMA_NOTAS } },
      messages: [{ role: 'user', content: prompt }],
    } as Anthropic.MessageCreateParamsNonStreaming,
    { timeout: 30000 },
  )
  return jsonDe<NotasQuestionario>(resp)
}

// ---------------------------------------------------------------------------
// Gerar relatório da atividade
// ---------------------------------------------------------------------------

function resumoAtividade(a: Atividade): string {
  const linhas = [
    `Título: ${a.titulo}`,
    `Descrição: ${a.descricao || '(sem descrição)'}`,
    `Criticidade: ${a.criticidade}`,
    `Status: ${deriveStatus(a)}`,
    `Prazo: ${formatarPrazo(a.prazo)}`,
    `Progresso: ${Math.round(progressoAtividade(a) * 100)}%`,
    `Tempo total registrado: ${formatarDuracao(tempoTotalMin(a))}`,
    'Passos:',
    ...a.passos.map(
      (p, i) =>
        `  ${i + 1}. [${p.concluido ? 'x' : ' '}] ${p.texto}` +
        (p.tempoGastoMin ? ` (${formatarDuracao(p.tempoGastoMin)})` : '') +
        (p.observacao ? ` — obs: ${p.observacao}` : ''),
    ),
  ]
  return linhas.join('\n')
}

export async function gerarRelatorio(atividade: Atividade): Promise<string> {
  const { modelo } = useConfig.getState()
  const prompt = `Você é um analista que redige relatórios profissionais de nível industrial.

Com base nos dados abaixo, escreva um relatório claro e objetivo em Markdown sobre
esta atividade, contendo: um resumo executivo, a situação atual (status, progresso,
prazo, criticidade), o que já foi feito (com base nos passos e observações), pontos
de atenção e uma conclusão. Use português formal.

Dados da atividade:
${resumoAtividade(atividade)}`

  const resp = await cliente().messages.create(
    { model: modelo, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] },
    { timeout: 60000 },
  )
  return textoDe(resp)
}
