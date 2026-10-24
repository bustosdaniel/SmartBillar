import { useState, type ReactNode } from 'react'
import type { Usuario } from '../types'
import { notificarAdministradores } from '../notificaciones/notificaciones'
import { leer } from '../utils/almacen'
import { AuthContext, type DatosRegistro } from './useAuth'
import { actualizarDatos, emailEnUso, guardarRegistrado, sinPassword, todosLosUsuarios, type DatosPerfil } from './usuarios'

const SESION_KEY = 'billar.usuario'

function leerSesion() {
  return leer<Usuario | null>(SESION_KEY, null) ?? leer<Usuario | null>(SESION_KEY, null, sessionStorage)
}

function guardarSesion(usuario: Usuario, recordar: boolean) {
  const storage = recordar ? localStorage : sessionStorage
  storage.setItem(SESION_KEY, JSON.stringify(usuario))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerSesion)

  function login(email: string, password: string, recordar: boolean) {
    const encontrado = todosLosUsuarios().find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    )
    if (!encontrado) return null
    const u = sinPassword(encontrado)
    guardarSesion(u, recordar)
    setUsuario(u)
    return u
  }

  function registrar({ nombre, email, telefono, cedula, password }: DatosRegistro) {
    if (emailEnUso(email)) {
      return { ok: false as const, error: 'Ya existe una cuenta con ese correo' }
    }
    const u = sinPassword(guardarRegistrado({ nombre, email, telefono, cedula, password, rol: 'cliente' }))
    notificarAdministradores('cuenta', 'Nuevo cliente registrado', `${nombre} creó su cuenta (${email}).`, '/admin/usuarios')
    guardarSesion(u, true)
    setUsuario(u)
    return { ok: true as const, usuario: u }
  }

  // Guarda los cambios y actualiza la sesión abierta, en el mismo almacenamiento donde estaba.
  function actualizarPerfil(datos: DatosPerfil) {
    if (!usuario) return 'No hay sesión iniciada.'
    const error = actualizarDatos(usuario.id, datos)
    if (error) return error
    const actualizado = { ...usuario, ...datos }
    guardarSesion(actualizado, localStorage.getItem(SESION_KEY) !== null)
    setUsuario(actualizado)
    return null
  }

  function logout() {
    setUsuario(null)
    localStorage.removeItem(SESION_KEY)
    sessionStorage.removeItem(SESION_KEY)
  }

  return <AuthContext value={{ usuario, login, registrar, actualizarPerfil, logout }}>{children}</AuthContext>
}
