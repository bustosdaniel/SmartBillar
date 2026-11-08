import { pedir } from '../api/cliente'
import type { Notificacion, TipoNotificacion, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

// Cada cuánto se vuelve a pedir la bandeja (para ver los avisos nuevos sin recargar).
const REFRESCO_MS = 10_000

// Antes vivían en el navegador; ahora están en MySQL. Se limpia una vez.
localStorage.removeItem('billar.notificaciones')

export const NOMBRES_TIPO: Record<TipoNotificacion, string> = {
  factura: 'Factura',
  membresia: 'Membresía',
  torneo: 'Torneo',
  cuenta: 'Cuenta',
  mesa: 'Mesa',
}

// Las propias y, para el personal, también las de los clientes (el registro de correos).
const store = crearStoreMemoria<Notificacion[]>([])

export const useNotificaciones = store.useValor

let yo: Usuario | null = null
let refresco: number | undefined

async function recargar() {
  if (!yo) return
  const lista = await pedir<Notificacion[]>('/notificaciones')
  if (yo) store.guardar(lista)
}

// Lo llama AuthContext al iniciar sesión; se refresca solo mientras la sesión siga abierta.
export function cargarNotificaciones(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refresco)
  refresco = window.setInterval(() => recargar().catch(() => {}), REFRESCO_MS)
  return recargar()
}

export function vaciarNotificaciones() {
  yo = null
  window.clearInterval(refresco)
  store.guardar([])
}

// TEMPORAL: las mesas aún viven en el navegador y envían sus avisos a MySQL con esta función. Cuando el
// backend los genere él mismo (paso 4) se elimina. Los invitados no tienen cuenta: no se les notifica.
export function notificar(usuarioId: number | null, tipo: TipoNotificacion, asunto: string, mensaje: string, ruta?: string) {
  if (usuarioId === null) return
  pedir('/notificaciones', { cuerpo: { usuarioId, tipo, asunto, mensaje, ruta } })
    .then(recargar)
    .catch((error) => console.error('No se pudo guardar el aviso:', error))
}

export function marcarLeida(id: number) {
  store.guardar(store.obtener().map((n) => (n.id === id ? { ...n, leida: true } : n)))
  pedir(`/notificaciones/${id}/leida`, { metodo: 'PATCH' }).catch(() => recargar().catch(() => {}))
}

export function marcarTodasLeidas(usuarioId: number) {
  store.guardar(store.obtener().map((n) => (n.usuarioId === usuarioId ? { ...n, leida: true } : n)))
  pedir('/notificaciones/leidas', { metodo: 'PATCH' }).catch(() => recargar().catch(() => {}))
}
