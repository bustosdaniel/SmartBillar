import { Navigate, Outlet } from 'react-router'
import type { Rol } from '../types'
import { rutaInicio } from './rutas'
import { useAuth } from './useAuth'

export function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== rol) return <Navigate to={rutaInicio(usuario.rol)} replace />
  return <Outlet />
}
