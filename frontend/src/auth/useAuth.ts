import { createContext, use } from 'react'
import type { Usuario } from '../types'
import type { DatosPerfil } from './usuarios'

export type DatosRegistro = {
  nombre: string
  email: string
  telefono: string
  password: string
}

export type AuthContextValue = {
  usuario: Usuario | null
  // Lanzan ErrorApi con el mensaje del backend si algo falla.
  login: (email: string, password: string, recordar: boolean) => Promise<Usuario>
  registrar: (datos: DatosRegistro) => Promise<Usuario>
  actualizarPerfil: (datos: DatosPerfil) => Promise<Usuario>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

// El cajero opera el día a día; precios, planes, reportes, empleados, anular cobros y torneos
// (crear, iniciar, llaves) son solo del administrador. El backend aplica la misma regla.
export function esAdministrador(usuario: Usuario | null) {
  return usuario?.rol === 'admin' && usuario.cargo === 'administrador'
}

export function useEsAdministrador() {
  return esAdministrador(useAuth().usuario)
}
