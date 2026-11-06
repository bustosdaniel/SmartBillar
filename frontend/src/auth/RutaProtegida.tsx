import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import type { Rol } from '../types'
import { rutaInicio } from './rutas'
import { useAuth, useEsAdministrador } from './useAuth'

export function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== rol) return <Navigate to={rutaInicio(usuario.rol)} replace />
  return <Outlet />
}

// Pantallas solo del administrador (el cajero vuelve al Inicio).
export function SoloAdministrador({ children }: { children: ReactNode }) {
  return useEsAdministrador() ? children : <Navigate to="/admin" replace />
}
