import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi, fijarToken, pedir } from '../api/cliente'
import type { Usuario } from '../types'
import { cargarMembresias, vaciarMembresias } from '../membresias/membresias'
import { leer } from '../utils/almacen'
import { AuthContext, type DatosRegistro } from './useAuth'
import { actualizarMiPerfil, cargarUsuarios, vaciarUsuarios, type DatosPerfil } from './usuarios'

// Token del backend + datos del usuario. "Recordarme" la guarda en localStorage; si no, en sessionStorage.
const SESION_KEY = 'billar.sesion'
// Clave de las sesiones del prototipo (sin token): se descartan y hay que volver a iniciar sesión.
const SESION_ANTIGUA = 'billar.usuario'

type Sesion = { token: string; usuario: Usuario }

function leerSesion() {
  localStorage.removeItem(SESION_ANTIGUA)
  sessionStorage.removeItem(SESION_ANTIGUA)
  return leer<Sesion | null>(SESION_KEY, null) ?? leer<Sesion | null>(SESION_KEY, null, sessionStorage)
}

function guardarSesion(sesion: Sesion, recordar: boolean) {
  const storage = recordar ? localStorage : sessionStorage
  storage.setItem(SESION_KEY, JSON.stringify(sesion))
}

function borrarSesion() {
  localStorage.removeItem(SESION_KEY)
  sessionStorage.removeItem(SESION_KEY)
}

function iniciar() {
  const sesion = leerSesion()
  fijarToken(sesion?.token ?? null)
  return sesion
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(iniciar)
  const usuario = sesion?.usuario ?? null

  function abrir(nueva: Sesion, recordar: boolean) {
    fijarToken(nueva.token)
    guardarSesion(nueva, recordar)
    setSesion(nueva)
    // Si falla, las pantallas siguen funcionando y los datos se vuelven a pedir al recargar.
    cargarUsuarios(nueva.usuario).catch(() => {})
    cargarMembresias(nueva.usuario).catch(() => {})
  }

  function logout() {
    fijarToken(null)
    borrarSesion()
    vaciarUsuarios()
    vaciarMembresias()
    setSesion(null)
  }

  // Al abrir la app se confirma con el backend que el token sigue vigente (y se refrescan los datos).
  useEffect(() => {
    const guardada = leerSesion()
    if (!guardada) return
    pedir<Usuario>('/auth/yo')
      .then((actual) => abrir({ ...guardada, usuario: actual }, localStorage.getItem(SESION_KEY) !== null))
      .catch((error) => {
        if (error instanceof ErrorApi && error.estado === 401) logout()
      })
  }, [])

  async function login(email: string, password: string, recordar: boolean) {
    const nueva = await pedir<Sesion>('/auth/login', { cuerpo: { email, password } })
    abrir(nueva, recordar)
    return nueva.usuario
  }

  async function registrar(datos: DatosRegistro) {
    const nueva = await pedir<Sesion>('/auth/registro', { cuerpo: datos })
    abrir(nueva, true)
    return nueva.usuario
  }

  async function actualizarPerfil(datos: DatosPerfil) {
    if (!sesion) throw new Error('No hay sesión iniciada.')
    const actualizada = { ...sesion, usuario: await actualizarMiPerfil(datos) }
    guardarSesion(actualizada, localStorage.getItem(SESION_KEY) !== null)
    setSesion(actualizada)
    return actualizada.usuario
  }

  return <AuthContext value={{ usuario, login, registrar, actualizarPerfil, logout }}>{children}</AuthContext>
}
