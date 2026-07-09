import { NavLink, Outlet } from 'react-router-dom'

const linkBase =
  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors'

function classe({ isActive }: { isActive: boolean }): string {
  return isActive
    ? `${linkBase} bg-slate-900 text-white`
    : `${linkBase} text-slate-600 hover:bg-slate-100`
}

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-slate-900">
            Gestor de Tarefas
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={classe}>
              Dashboard
            </NavLink>
            <NavLink to="/nova" className={classe}>
              Nova
            </NavLink>
            <NavLink to="/historico" className={classe}>
              Histórico
            </NavLink>
            <NavLink to="/diagnostico" className={classe}>
              Diagnóstico
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
