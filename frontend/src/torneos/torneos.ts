import { pedir } from '../api/cliente'
import { refrescarCaja } from '../caja/caja'
import type { CategoriaTorneo, EstadoTorneo, Jugador, MetodoPago, Plan, Torneo, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

// Cada cuánto se vuelven a pedir (para ver inscripciones y resultados de otros dispositivos).
const REFRESCO_MS = 10_000

// Antes vivían en el navegador; ahora están en MySQL. Se limpia una vez.
localStorage.removeItem('billar.torneos')

export const NOMBRES_CATEGORIA: Record<CategoriaTorneo, string> = {
  abierta: 'Abierta',
  principiante: 'Principiante',
  avanzado: 'Avanzado',
}

export const TEXTO_ESTADO_TORNEO: Record<EstadoTorneo, string> = {
  inscripciones: 'Inscripciones abiertas',
  'en-curso': 'En curso',
  finalizado: 'Finalizado',
}

const fechaCorta = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

export function formatearFechaTorneo(torneo: Torneo) {
  const [a, m, d] = torneo.fecha.split('-').map(Number)
  return `${fechaCorta.format(new Date(a, m - 1, d))} · ${torneo.hora}`
}

const store = crearStoreMemoria<Torneo[]>([])

export const useTorneos = store.useValor

let yo: Usuario | null = null
let refresco: number | undefined

async function recargar() {
  if (!yo) return
  const lista = await pedir<Torneo[]>('/torneos')
  if (yo) store.guardar(lista)
}

// Lo llama AuthContext al iniciar sesión; se refresca solo mientras la sesión siga abierta.
export function cargarTorneos(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refresco)
  refresco = window.setInterval(() => recargar().catch(() => {}), REFRESCO_MS)
  return recargar()
}

export function vaciarTorneos() {
  yo = null
  window.clearInterval(refresco)
  store.guardar([])
}

// El backend calcula el precio real; este cálculo solo es para mostrarlo antes de confirmar.
export function precioInscripcion(torneo: Torneo, plan: Plan | null) {
  const descuento = Math.min(100, plan?.descuentoTorneo ?? 0)
  return Math.round((torneo.inscripcion * (100 - descuento)) / 100 / 100) * 100
}

export function cuposLibres(torneo: Torneo) {
  return torneo.cupos - torneo.jugadores.length
}

export type DatosTorneo = Omit<Torneo, 'id' | 'estado' | 'jugadores' | 'partidos'>
type DatosCobro = { metodo: MetodoPago; recibido: number | null }

export async function crearTorneo(datos: DatosTorneo) {
  const { id } = await pedir<{ id: number }>('/torneos', { cuerpo: datos })
  await recargar()
  return id
}

export function validarInscripcion(torneo: Torneo, clienteId: number | null): string | null {
  if (torneo.estado !== 'inscripciones') return 'Las inscripciones están cerradas.'
  if (cuposLibres(torneo) <= 0) return 'No quedan cupos.'
  if (clienteId !== null && torneo.jugadores.some((j) => j.clienteId === clienteId)) return 'Este cliente ya está inscrito.'
  return null
}

// El personal inscribe y cobra en una sola transacción: si el cobro falla, no queda inscrito.
export async function inscribirCliente(torneoId: number, clienteId: number, pago: DatosCobro | null) {
  await pedir(`/torneos/${torneoId}/inscripciones`, { cuerpo: { clienteId, pago } })
  await Promise.all([recargar(), refrescarCaja()])
}

// El cliente reserva su cupo desde la app y paga en caja.
export async function inscribirme(torneoId: number) {
  await pedir(`/torneos/${torneoId}/mi-inscripcion`, { metodo: 'POST' })
  await recargar()
}

export async function cobrarPendiente(torneoId: number, jugadorId: number, pago: DatosCobro | null) {
  await pedir(`/torneos/${torneoId}/jugadores/${jugadorId}/cobro`, { cuerpo: { pago } })
  await Promise.all([recargar(), refrescarCaja()])
}

// Solo antes de iniciar. Si se devuelve el dinero, sale de la caja en la misma transacción.
export async function quitarJugador(torneoId: number, jugadorId: number, devolver: boolean) {
  await pedir(`/torneos/${torneoId}/jugadores/${jugadorId}?devolver=${devolver}`, { metodo: 'DELETE' })
  await Promise.all([recargar(), refrescarCaja()])
}

export async function retirarme(torneoId: number) {
  await pedir(`/torneos/${torneoId}/mi-inscripcion`, { metodo: 'DELETE' })
  await recargar()
}

// El cliente puede retirarse solo si no hay dinero que devolver; si pagó, la devolución se hace en caja.
export function puedeRetirarse(torneo: Torneo, jugador: Jugador) {
  return torneo.estado === 'inscripciones' && (!jugador.pagado || jugador.monto === 0)
}

export async function iniciarTorneo(torneoId: number) {
  await pedir(`/torneos/${torneoId}/iniciar`, { metodo: 'POST' })
  await recargar()
}

export async function asignarMesa(torneoId: number, partidoId: number, mesaId: number | null) {
  await pedir(`/torneos/${torneoId}/partidos/${partidoId}/mesa`, { metodo: 'PUT', cuerpo: { mesaId } })
  await recargar()
}

export async function registrarGanador(torneoId: number, partidoId: number, jugadorId: number) {
  await pedir(`/torneos/${torneoId}/partidos/${partidoId}/ganador`, { metodo: 'PUT', cuerpo: { jugadorId } })
  await recargar()
}

export function nombreJugador(torneo: Torneo, jugadorId: number | null) {
  return torneo.jugadores.find((j) => j.id === jugadorId)?.nombre ?? null
}
