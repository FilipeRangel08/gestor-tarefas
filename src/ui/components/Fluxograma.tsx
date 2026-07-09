// Fluxograma dos passos (§8, Fase 2). Diagrama SVG em camadas montado a partir
// do campo `dependeDe`: cada passo vira uma caixa, cada dependência vira uma seta.
// Passos com observação ganham um marcador 📝; passar o mouse (ou clicar, que
// fixa) revela a anotação num cartão. Sem biblioteca externa.

import { useState } from 'react'
import { podeConcluirPasso } from '../../domain/rules'
import type { Passo } from '../../domain/types'

const LARGURA = 180
const ALTURA = 58
const GAP_X = 32
const GAP_Y = 56
const PAD = 6
const POP_W = 220
const POP_H = 96

/** Nível (camada) de cada passo = maior caminho de dependência até ele. */
function calcularNiveis(passos: Passo[]): Map<string, number> {
  const porId = new Map(passos.map((p) => [p.id, p]))
  const nivel = new Map<string, number>()
  const emCurso = new Set<string>()

  function calc(id: string): number {
    const memo = nivel.get(id)
    if (memo !== undefined) return memo
    if (emCurso.has(id)) return 0 // proteção contra ciclo (não deveria ocorrer)
    emCurso.add(id)
    const p = porId.get(id)
    const n = p?.dependeDe && porId.has(p.dependeDe) ? calc(p.dependeDe) + 1 : 0
    emCurso.delete(id)
    nivel.set(id, n)
    return n
  }

  passos.forEach((p) => calc(p.id))
  return nivel
}

export function Fluxograma({ passos }: { passos: Passo[] }) {
  // hover e clique-fixado da observação (o fixado tem prioridade).
  const [sobre, setSobre] = useState<string | null>(null)
  const [fixada, setFixada] = useState<string | null>(null)

  if (passos.length === 0) return null

  const niveis = calcularNiveis(passos)
  const maxNivel = Math.max(0, ...passos.map((p) => niveis.get(p.id)!))

  const porNivel: Passo[][] = Array.from({ length: maxNivel + 1 }, () => [])
  passos.forEach((p) => porNivel[niveis.get(p.id)!].push(p))
  porNivel.forEach((linha) => linha.sort((a, b) => a.ordem - b.ordem))

  const maxLargura = Math.max(...porNivel.map((l) => l.length))
  const larguraTotal = maxLargura * (LARGURA + GAP_X) - GAP_X
  const alturaTotal = (maxNivel + 1) * (ALTURA + GAP_Y) - GAP_Y

  // Canvas com largura mínima do popover; conteúdo centralizado.
  const temObs = passos.some((p) => p.observacao.trim())
  const offsetX = Math.max(0, (POP_W - larguraTotal) / 2)
  const svgLargura = Math.max(larguraTotal, POP_W) + PAD * 2
  const svgAltura = alturaTotal + PAD * 2 + (temObs ? POP_H + 12 : 0)

  const pos = new Map<string, { x: number; y: number }>()
  porNivel.forEach((linha, i) => {
    const larguraLinha = linha.length * (LARGURA + GAP_X) - GAP_X
    const inicioX = (larguraTotal - larguraLinha) / 2
    linha.forEach((p, j) => {
      pos.set(p.id, {
        x: PAD + offsetX + inicioX + j * (LARGURA + GAP_X),
        y: PAD + i * (ALTURA + GAP_Y),
      })
    })
  })

  const ordemDe = new Map(passos.map((p) => [p.id, p.ordem]))
  const visivelId = fixada ?? sobre
  const passoVisivel = visivelId ? passos.find((p) => p.id === visivelId) : undefined

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        <svg
          width={svgLargura}
          height={svgAltura}
          viewBox={`0 0 ${svgLargura} ${svgAltura}`}
          className="mx-auto block"
          role="img"
          aria-label="Fluxograma de dependências dos passos"
        >
          <defs>
            <marker
              id="fluxo-seta"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Setas (dependência -> passo). */}
          {passos.map((p) => {
            if (!p.dependeDe || !pos.has(p.dependeDe)) return null
            const dep = pos.get(p.dependeDe)!
            const alvo = pos.get(p.id)!
            const x1 = dep.x + LARGURA / 2
            const y1 = dep.y + ALTURA
            const x2 = alvo.x + LARGURA / 2
            const y2 = alvo.y
            const meio = (y1 + y2) / 2
            return (
              <path
                key={`seta-${p.id}`}
                d={`M ${x1} ${y1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${y2}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.5}
                markerEnd="url(#fluxo-seta)"
              />
            )
          })}

          {/* Caixas dos passos. */}
          {passos.map((p) => {
            const { x, y } = pos.get(p.id)!
            const bloqueado = !p.concluido && !podeConcluirPasso(p.id, passos)
            const temNota = p.observacao.trim().length > 0
            const estilo = p.concluido
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
              : bloqueado
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-300 bg-white text-slate-700'
            const marca = p.concluido ? ' ✓' : bloqueado ? ' 🔒' : ''
            const dica = p.dependeDe
              ? `Depende do passo ${ordemDe.get(p.dependeDe) ?? '?'}`
              : undefined
            return (
              <foreignObject key={`box-${p.id}`} x={x} y={y} width={LARGURA} height={ALTURA}>
                <div
                  title={dica}
                  onMouseEnter={temNota ? () => setSobre(p.id) : undefined}
                  onMouseLeave={temNota ? () => setSobre((s) => (s === p.id ? null : s)) : undefined}
                  onClick={temNota ? () => setFixada((f) => (f === p.id ? null : p.id)) : undefined}
                  className={`relative flex h-full flex-col justify-center overflow-hidden rounded-lg border-2 px-2.5 py-1 ${estilo} ${
                    temNota ? 'cursor-pointer' : ''
                  }`}
                >
                  {temNota && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] shadow ring-1 ring-slate-200"
                      aria-label="Tem observação"
                    >
                      📝
                    </span>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    Passo {p.ordem}
                    {marca}
                  </span>
                  <span className="line-clamp-2 text-xs leading-tight">{p.texto}</span>
                </div>
              </foreignObject>
            )
          })}

          {/* Cartão da observação (revelado sob demanda). */}
          {passoVisivel &&
            (() => {
              const box = pos.get(passoVisivel.id)!
              const centro = box.x + LARGURA / 2
              const px = Math.min(Math.max(centro - POP_W / 2, PAD), svgLargura - PAD - POP_W)
              const py = box.y + ALTURA + 8
              return (
                <foreignObject x={px} y={py} width={POP_W} height={POP_H}>
                  <div
                    onMouseEnter={() => setSobre(passoVisivel.id)}
                    onMouseLeave={() => setSobre((s) => (s === passoVisivel.id ? null : s))}
                    className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        📝 Passo {passoVisivel.ordem} — observação
                      </span>
                      {fixada === passoVisivel.id && (
                        <button
                          onClick={() => setFixada(null)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                          aria-label="Fechar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="overflow-y-auto text-xs leading-snug text-slate-700">
                      {passoVisivel.observacao}
                    </p>
                  </div>
                </foreignObject>
              )
            })()}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <Legenda cor="bg-emerald-400" rotulo="Concluído" />
        <Legenda cor="bg-amber-300" rotulo="Bloqueado (aguarda dependência)" />
        <Legenda cor="bg-slate-300" rotulo="Pendente" />
        {temObs && <span className="text-slate-400">📝 tem observação (passe o mouse ou clique)</span>}
      </div>
    </div>
  )
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cor}`} />
      {rotulo}
    </span>
  )
}
