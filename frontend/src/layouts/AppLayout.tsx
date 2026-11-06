import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { NOMBRES_CARGO } from '../auth/usuarios'
import { Logo } from '../components/Logo'

export type ItemMenu = {
  ruta: string
  texto: string
  icono: LucideIcon
  exacta?: boolean
  insignia?: number
}

export function AppLayout({ items }: { items: ItemMenu[] }) {
  const location = useLocation()
  const { usuario, logout } = useAuth()
  const cargo = usuario?.cargo ?? 'administrador'
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="app">
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="sidebar-cabecera">
          <Logo />
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {items.map(({ ruta, texto, icono: Icono, exacta, insignia }) => (
            <NavLink key={ruta} to={ruta} end={exacta} onClick={() => setMenuAbierto(false)}>
              <Icono size={18} aria-hidden="true" />
              {texto}
              {!!insignia && (
                <span className="menu-insignia" aria-label={`${insignia} sin leer`}>
                  {insignia > 9 ? '9+' : insignia}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <div className="avatar" aria-hidden="true">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-usuario">
            <strong>{usuario?.nombre}</strong>
            <span>{usuario?.rol === 'admin' ? NOMBRES_CARGO[cargo] : 'Cliente'}</span>
          </div>
          <button type="button" className="boton-icono" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="contenido">
        <div key={location.key} className="transicion-ruta">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
