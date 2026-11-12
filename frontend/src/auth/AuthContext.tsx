import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi, fijarToken, pedir } from '../api/cliente'
import type { Usuario } from '../types'
import { cargarCaja, vaciarCaja } from '../caja/caja'
import { cargarMesas, vaciarMesas } from '../mesas/sesiones'
import { cargarMembresias, vaciarMembresias } from '../membresias/membresias'
import { cargarMovimientos, vaciarMovimientos } from '../actividad/movimientos'
import { cargarNotificaciones, vaciarNotificaciones } from '../notificaciones/notificaciones'
import { cargarTorneos, vaciarTorneos } from '../torneos/torneos'
import { leer } from '../utils/almacen'
import { AuthContext, type DatosRegistro } from './useAuth'
import { actualizarMiPerfil, cargarUsuarios, vaciarUsuarios, type DatosPerfil } from './usuarios'

// Token del backend + datos del usuario. "Recordarme" la guarda en localStorage; si no, en sessionStorage.
const SESION_KEY = 'billar.sesion'
// Clave de las sesiones del prototipo (sin token): se descartan y hay que volver a iniciar sesión.
const SESION_ANTIGUA = 'billar.usuario'
// Si el backend tarda más que esto, se muestra la app igual (cada pantalla se completa al llegar sus datos).
const ESPERA_MAXIMA_MS = 12_000

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
  // Con una sesión guardada se empieza cargando: primero se confirma con el backend.
  const [cargando, setCargando] = useState(() => sesion !== null)
  const usuario = sesion?.usuario ?? null

  // Pide todos los datos y espera a que lleguen (o fallen) antes de mostrar las pantallas. Si algo falla,
  // las pantallas siguen funcionando y esos datos se vuelven a pedir en el siguiente refresco.
  async function abrir(nueva: Sesion, recordar: boolean) {
    fijarToken(nueva.token)
    guardarSesion(nueva, recordar)
    setSesion(nueva)
    setCargando(true)
    const cargas = Promise.allSettled([
      cargarUsuarios(nueva.usuario),
      cargarMembresias(nueva.usuario),
      cargarCaja(nueva.usuario),
      cargarNotificaciones(nueva.usuario),
      cargarMovimientos(nueva.usuario),
      cargarTorneos(nueva.usuario),
      cargarMesas(nueva.usuario),
    ])
    await Promise.race([cargas, new Promise((listo) => setTimeout(listo, ESPERA_MAXIMA_MS))])
    setCargando(false)
  }

  function logout() {
    fijarToken(null)
    borrarSesion()
    vaciarUsuarios()
    vaciarMembresias()
    vaciarCaja()
    vaciarNotificaciones()
    vaciarMovimientos()
    vaciarTorneos()
    vaciarMesas()
    setSesion(null)
    setCargando(false)
  }

  // Al abrir la app se confirma con el backend que el token sigue vigente (y se refrescan los datos).
  useEffect(() => {
    const guardada = leerSesion()
    if (!guardada) return
    pedir<Usuario>('/auth/yo')
      .then((actual) => abrir({ ...guardada, usuario: actual }, localStorage.getItem(SESION_KEY) !== null))
      .catch((error) => {
        if (error instanceof ErrorApi && error.estado === 401) logout()
        // Backend apagado: se muestra la app con el aviso de "sin conexión" de cada pantalla.
        else setCargando(false)
      })
  }, [])

  async function login(email: string, password: string, recordar: boolean) {
    const nueva = await pedir<Sesion>('/auth/login', { cuerpo: { email, password } })
    void abrir(nueva, recordar)
    return nueva.usuario
  }

  async function registrar(datos: DatosRegistro) {
    const nueva = await pedir<Sesion>('/auth/registro', { cuerpo: datos })
    void abrir(nueva, true)
    return nueva.usuario
  }

  async function actualizarPerfil(datos: DatosPerfil) {
    if (!sesion) throw new Error('No hay sesión iniciada.')
    const actualizada = { ...sesion, usuario: await actualizarMiPerfil(datos) }
    guardarSesion(actualizada, localStorage.getItem(SESION_KEY) !== null)
    setSesion(actualizada)
    return actualizada.usuario
  }

  return <AuthContext value={{ usuario, cargando, login, registrar, actualizarPerfil, logout }}>{children}</AuthContext>
}
