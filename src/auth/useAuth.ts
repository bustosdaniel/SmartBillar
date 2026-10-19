import { createContext, use } from 'react'
import type { Usuario } from '../types'
import type { DatosPerfil } from './usuarios'

export type DatosRegistro = {
  nombre: string
  email: string
  telefono: string
  cedula: string
  password: string
}

export type AuthContextValue = {
  usuario: Usuario | null
  login: (email: string, password: string, recordar: boolean) => Usuario | null
  registrar: (datos: DatosRegistro) => { ok: true; usuario: Usuario } | { ok: false; error: string }
  actualizarPerfil: (datos: DatosPerfil) => string | null
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
