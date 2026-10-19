import { todosLosUsuarios } from '../auth/usuarios'
import type { Notificacion, TipoNotificacion } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'

const MAXIMO = 300

export const NOMBRES_TIPO: Record<TipoNotificacion, string> = {
  factura: 'Factura',
  membresia: 'Membresía',
  torneo: 'Torneo',
  cuenta: 'Cuenta',
}

const store = crearStoreLocal<Notificacion[]>('billar.notificaciones', [])

export const useNotificaciones = store.useValor

// Solo se notifica a quien tiene cuenta (los invitados no dejan correo).
export function notificar(usuarioId: number | null, tipo: TipoNotificacion, asunto: string, mensaje: string) {
  if (usuarioId === null) return
  const usuario = todosLosUsuarios().find((u) => u.id === usuarioId)
  if (!usuario) return
  const fecha = Date.now()
  const nueva: Notificacion = {
    id: `${fecha}-${Math.random().toString(36).slice(2, 7)}`,
    usuarioId,
    nombre: usuario.nombre,
    email: usuario.email,
    tipo,
    asunto,
    mensaje,
    fecha,
    leida: false,
  }
  store.guardar([nueva, ...store.obtener()].slice(0, MAXIMO))
}

export function notificarAdministradores(tipo: TipoNotificacion, asunto: string, mensaje: string) {
  todosLosUsuarios()
    .filter((usuario) => usuario.rol === 'admin')
    .forEach((usuario) => notificar(usuario.id, tipo, asunto, mensaje))
}

export function notificarPorEmail(email: string, tipo: TipoNotificacion, asunto: string, mensaje: string) {
  const usuario = todosLosUsuarios().find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (usuario) notificar(usuario.id, tipo, asunto, mensaje)
}

export function marcarLeida(id: string) {
  store.guardar(store.obtener().map((n) => (n.id === id ? { ...n, leida: true } : n)))
}

export function marcarTodasLeidas(usuarioId: number) {
  store.guardar(store.obtener().map((n) => (n.usuarioId === usuarioId ? { ...n, leida: true } : n)))
}
