// Serviço de IA multi-provedor (§14 do PLANO.md).
//
// Uma primitiva `completar()` despacha para o provedor ativo (Anthropic, OpenAI
// ou Gemini). As funções de alto nível (sugerir passos/notas, gerar relatório)
// são construídas em cima dela e não sabem qual provedor está em uso.
//
// Roda direto do navegador com a chave do próprio usuário. Se um dia virar
// multiusuário, troca-se esta camada por um proxy no backend — a UI não muda.

import Anthropic from '@anthropic-ai/sdk'
import { useConfig } from './config'
import { deriveStatus, progressoAtividade, tempoTotalMin } from '../domain/rules'
import { formatarDuracao, formatarPrazo } from './datas'
import type { Atividade, NotasQuestionario } from '../domain/types'

/** Erro normalizado, com mensagem já amigável em português. */
export class ErroIA extends Error {}

export function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Erro desconhecido.'
}

interface Chamada {
  prompt: string
  maxTokens: number
  /** Pede saída em JSON (ativa o "modo JSON" do provedor quando existe). */
  json?: boolean
  timeoutMs: number
}

/** Despacha para o provedor ativo. */
async function completar(c: Chamada): Promise<string> {
  const { provedor } = useConfig.getState()
  switch (provedor) {
    case 'anthropic':
      return completarAnthropic(c)
    case 'openai':
      return completarOpenAI(c)
    case 'gemini':
      return completarGemini(c)
  }
}

// ---------------------------------------------------------------------------
// Provedor: Anthropic (SDK oficial)
// ---------------------------------------------------------------------------

async function completarAnthropic({ prompt, maxTokens, timeoutMs }: Chamada): Promise<string> {
  const { chaves, modelos } = useConfig.getState()
  if (!chaves.anthropic.trim()) throw new ErroIA('Configure a chave da Anthropic em Configurações.')
  const client = new Anthropic({ apiKey: chaves.anthropic, dangerouslyAllowBrowser: true })
  try {
    const resp = await client.messages.create(
      { model: modelos.anthropic, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] },
      { timeout: timeoutMs },
    )
    const bloco = resp.content.find((b) => b.type === 'text')
    return bloco && bloco.type === 'text' ? bloco.text : ''
  } catch (e) {
    throw normalizarAnthropic(e)
  }
}

function normalizarAnthropic(e: unknown): ErroIA {
  if (e instanceof Anthropic.AuthenticationError) return new ErroIA('Chave da API Anthropic inválida.')
  if (e instanceof Anthropic.PermissionDeniedError)
    return new ErroIA('A chave Anthropic não tem permissão para este modelo.')
  if (e instanceof Anthropic.NotFoundError)
    return new ErroIA('Modelo não encontrado (Anthropic). Verifique o nome do modelo em Configurações.')
  if (e instanceof Anthropic.RateLimitError) return new ErroIA('Limite de uso da Anthropic atingido. Tente mais tarde.')
  if (e instanceof Anthropic.APIConnectionError)
    return new ErroIA('Não foi possível conectar à API Anthropic (rede bloqueada, offline ou proxy).')
  if (e instanceof Anthropic.APIError) return new ErroIA(`Erro da API Anthropic (${e.status ?? '?'}): ${e.message}`)
  return e instanceof ErroIA ? e : new ErroIA(e instanceof Error ? e.message : 'Erro desconhecido (Anthropic).')
}

// ---------------------------------------------------------------------------
// Provedor: OpenAI (HTTP direto)
// ---------------------------------------------------------------------------

async function completarOpenAI({ prompt, json, timeoutMs }: Chamada): Promise<string> {
  const { chaves, modelos } = useConfig.getState()
  if (!chaves.openai.trim()) throw new ErroIA('Configure a chave da OpenAI em Configurações.')
  const corpo: Record<string, unknown> = {
    model: modelos.openai,
    messages: [{ role: 'user', content: prompt }],
  }
  if (json) corpo.response_format = { type: 'json_object' }
  const resp = await fetchIA(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${chaves.openai}` },
      body: JSON.stringify(corpo),
    },
    'OpenAI',
    timeoutMs,
  )
  const dados = (await resp.json()) as { choices?: { message?: { content?: string } }[] }
  return dados.choices?.[0]?.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// Provedor: Google Gemini (HTTP direto)
// ---------------------------------------------------------------------------

async function completarGemini({ prompt, json, maxTokens, timeoutMs }: Chamada): Promise<string> {
  const { chaves, modelos } = useConfig.getState()
  if (!chaves.gemini.trim()) throw new ErroIA('Configure a chave do Gemini em Configurações.')
  const corpo: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelos.gemini,
  )}:generateContent?key=${encodeURIComponent(chaves.gemini)}`
  const resp = await fetchIA(
    url,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) },
    'Gemini',
    timeoutMs,
  )
  const dados = (await resp.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
}

// ---------------------------------------------------------------------------
// Helpers HTTP compartilhados (OpenAI/Gemini)
// ---------------------------------------------------------------------------

async function fetchIA(
  url: string,
  init: RequestInit,
  nome: string,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let resp: Response
  try {
    resp = await fetch(url, { ...init, signal: ctrl.signal })
  } catch {
    throw new ErroIA(
      `Não foi possível conectar à API ${nome} (rede bloqueada, offline, proxy ou tempo esgotado).`,
    )
  } finally {
    clearTimeout(timer)
  }
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '')
    throw new ErroIA(descreverStatus(nome, resp.status, corpo))
  }
  return resp
}

function descreverStatus(nome: string, status: number, corpo: string): string {
  if (status === 401 || status === 403) return `Chave da API ${nome} inválida ou sem permissão.`
  if (status === 404) return `Modelo não encontrado (${nome}). Verifique o nome do modelo em Configurações.`
  if (status === 429) return `Limite de uso da ${nome} atingido. Tente mais tarde.`
  if (status >= 500) return `Serviço ${nome} indisponível no momento.`
  if (status === 400) {
    const msg = extrairMensagemErro(corpo)
    return `Requisição inválida (${nome})${msg ? `: ${msg}` : ' — verifique o modelo configurado.'}`
  }
  return `Erro ${status} (${nome}).`
}

function extrairMensagemErro(corpo: string): string {
  try {
    const j = JSON.parse(corpo) as { error?: { message?: string } | string }
    if (typeof j.error === 'string') return j.error
    return j.error?.message ?? ''
  } catch {
    return ''
  }
}

/** Extrai um objeto JSON de uma resposta em texto (tolera cercas de código). */
function extrairJSON<T>(texto: string): T {
  let s = texto.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const ini = s.indexOf('{')
  const fim = s.lastIndexOf('}')
  if (ini >= 0 && fim > ini) s = s.slice(ini, fim + 1)
  return JSON.parse(s) as T
}

// ---------------------------------------------------------------------------
// Testar conexão (valida se a rede libera o provedor ativo)
// ---------------------------------------------------------------------------

export async function testarConexao(): Promise<{ ok: boolean; erro?: string }> {
  try {
    await completar({ prompt: 'Responda apenas: ok', maxTokens: 16, timeoutMs: 20000 })
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

export async function sugerirPassos(titulo: string, descricao: string): Promise<PassoSugerido[]> {
  const prompt = `Divida a tarefa abaixo em 3 a 8 passos práticos e ordenados.

Tarefa: "${titulo}"
Descrição: ${descricao || '(sem descrição)'}

Quando um passo só puder começar depois de outro estar pronto, indique a dependência pela ordem (1-based).
Responda APENAS com JSON válido, sem texto extra e sem cercas de código, no formato exato:
{"passos":[{"texto":"...","dependeDeOrdem":0}]}
onde "dependeDeOrdem" é 0 (sem dependência) ou o número do passo anterior do qual este depende.
Escreva os textos em português.`

  const texto = await completar({ prompt, json: true, maxTokens: 1024, timeoutMs: 30000 })
  const dados = extrairJSON<{ passos: PassoSugerido[] }>(texto)
  return (dados.passos ?? []).map((p) => ({
    texto: String(p.texto ?? '').trim(),
    dependeDeOrdem: Number(p.dependeDeOrdem) || 0,
  }))
}

// ---------------------------------------------------------------------------
// Sugerir notas de criticidade (§3)
// ---------------------------------------------------------------------------

export async function sugerirNotas(titulo: string, descricao: string): Promise<NotasQuestionario> {
  const prompt = `Avalie a criticidade da tarefa abaixo com uma nota de 1 a 5 em cada critério.

Tarefa: "${titulo}"
Descrição: ${descricao || '(sem descrição)'}

Critérios (1 = baixo, 5 = máximo):
- urgencia: pressão do prazo
- impacto: consequência de não fazer
- dependencia: o quanto trava outras tarefas ou terceiros

Responda APENAS com JSON válido, sem texto extra, no formato exato:
{"urgencia":3,"impacto":3,"dependencia":3}`

  const texto = await completar({ prompt, json: true, maxTokens: 256, timeoutMs: 30000 })
  const n = extrairJSON<NotasQuestionario>(texto)
  const clamp = (x: unknown) => Math.min(5, Math.max(1, Math.round(Number(x) || 3)))
  return { urgencia: clamp(n.urgencia), impacto: clamp(n.impacto), dependencia: clamp(n.dependencia) }
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
  const prompt = `Você é um analista que redige relatórios profissionais de nível industrial.

Com base nos dados abaixo, escreva um relatório claro e objetivo em Markdown sobre esta
atividade, contendo: resumo executivo, situação atual (status, progresso, prazo,
criticidade), o que já foi feito (com base nos passos e observações), pontos de atenção e
conclusão. Use português formal.

Dados da atividade:
${resumoAtividade(atividade)}`

  return completar({ prompt, maxTokens: 2048, timeoutMs: 60000 })
}
