// Barra de progresso. Recebe valor em [0, 1].

export function BarraProgresso({
  valor,
  mostrarRotulo = true,
}: {
  valor: number
  mostrarRotulo?: boolean
}) {
  const pct = Math.round(valor * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {mostrarRotulo && (
        <span className="w-10 shrink-0 text-right text-sm font-medium text-slate-600">
          {pct}%
        </span>
      )}
    </div>
  )
}
