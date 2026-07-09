// Utilitários de data. Isolados aqui para o resto do app não lidar com
// fuso/formatação diretamente.

/** Timestamp ISO completo do momento atual (ex.: 2026-07-08T14:30:00.000Z). */
export function agoraISO(): string {
  return new Date().toISOString()
}

/** Data local de hoje no formato YYYY-MM-DD (sem componente de fuso). */
export function hojeISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Formata YYYY-MM-DD para DD/MM (ou DD/MM/AAAA se ano != atual). */
export function formatarPrazo(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  const anoAtual = String(new Date().getFullYear())
  return ano === anoAtual ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`
}

/** Formata timestamp ISO para DD/MM/AAAA HH:MM. */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Minutos -> "2h 15min" / "45min" / "—". */
export function formatarDuracao(min: number): string {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}
