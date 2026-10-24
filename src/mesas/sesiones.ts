import { registrarMovimiento } from '../actividad/movimientos'
import type { Consumo, EstadoMesa, MetodoPago, ModoCobro, Producto, Sesion, SesionFinalizada } from '../types'
import type { CuentaMesa } from './cuenta'
import { notificar } from '../notificaciones/notificaciones'
import { formatearDuracion, formatearPesos } from '../utils/formato'
import { crearStoreLocal } from '../utils/storeLocal'

type SesionesPorMesa = Partial<Record<number, Sesion>>

const activas = crearStoreLocal<SesionesPorMesa>('billar.sesiones', {})
const finalizadas = crearStoreLocal<SesionFinalizada[]>('billar.sesiones-finalizadas', [])

export const useSesiones = activas.useValor
export const useSesionesFinalizadas = finalizadas.useValor

export function estaDetenida(sesion: Sesion) {
  return (sesion.detenidaEn ?? null) !== null
}

export function estadoMesa(sesion: Sesion | undefined): EstadoMesa {
  if (!sesion) return 'libre'
  if (estaDetenida(sesion)) return 'por-cobrar'
  return sesion.pausadaDesde === null ? 'en-uso' : 'pausada'
}

// El tiempo en pausa no se cobra, y tras pulsar Finalizar ya no corre.
export function tiempoJugado(sesion: Sesion, ahora: number) {
  const hasta = sesion.detenidaEn ?? sesion.pausadaDesde ?? ahora
  return Math.max(0, hasta - sesion.inicio - sesion.pausadoMs)
}

// Se cobra por minuto iniciado, redondeado a la centena.
export function calcularCosto(tiempoMs: number, tarifaHora: number) {
  const minutos = Math.ceil(tiempoMs / 60000)
  return Math.round((minutos * tarifaHora) / 60 / 100) * 100
}

export type CobroInicial = {
  modoCobro: ModoCobro
  tarifaHora: number
  precioPartida: number
  regla: string | null
}

export function iniciarSesion(mesaId: number, cliente: { id: number | null; nombre: string }, cobro: CobroInicial) {
  const sesiones = activas.obtener()
  if (sesiones[mesaId]) return
  activas.guardar({
    ...sesiones,
    [mesaId]: {
      mesaId,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      inicio: Date.now(),
      pausadoMs: 0,
      pausadaDesde: null,
      ...cobro,
      // Por partida, la primera se cuenta al entregar las bolas.
      partidas: cobro.modoCobro === 'partida' ? 1 : 0,
    },
  })
  registrarMovimiento({
    tipo: 'inicio',
    titulo: `Mesa ${mesaId}`,
    detalle: `Inicio de sesión · ${cliente.nombre}${cobro.modoCobro === 'partida' ? ' · por partida' : ''}`,
  })
  notificar(
    cliente.id,
    'mesa',
    `Tu mesa está lista · Mesa ${mesaId}`,
    'Ya empezó a contar tu tiempo. Síguelo en vivo desde Mi mesa. ¡Buen juego!',
    '/cliente/mesa',
  )
}

export function cambiarPartidas(mesaId: number, delta: number) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion || sesion.modoCobro !== 'partida' || estaDetenida(sesion)) return
  activas.guardar({ ...sesiones, [mesaId]: { ...sesion, partidas: Math.max(1, (sesion.partidas ?? 1) + delta) } })
}

export function pausarSesion(mesaId: number) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion || sesion.pausadaDesde !== null || estaDetenida(sesion)) return
  activas.guardar({ ...sesiones, [mesaId]: { ...sesion, pausadaDesde: Date.now() } })
  registrarMovimiento({ tipo: 'pausa', titulo: `Mesa ${mesaId}`, detalle: 'Sesión pausada' })
}

export function reanudarSesion(mesaId: number) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion || sesion.pausadaDesde === null || estaDetenida(sesion)) return
  activas.guardar({
    ...sesiones,
    [mesaId]: {
      ...sesion,
      pausadoMs: sesion.pausadoMs + (Date.now() - sesion.pausadaDesde),
      pausadaDesde: null,
    },
  })
  registrarMovimiento({ tipo: 'reanudar', titulo: `Mesa ${mesaId}`, detalle: 'Sesión reanudada' })
}

// Finalizar congela el tiempo en todas las pantallas. Si la mesa estaba en pausa,
// esa pausa se cierra para que el tiempo detenido sea exactamente el jugado.
export function detenerSesion(mesaId: number): Sesion | null {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion) return null
  if (estaDetenida(sesion)) return sesion
  const ahora = Date.now()
  const detenida: Sesion = {
    ...sesion,
    pausadoMs: sesion.pausadoMs + (sesion.pausadaDesde === null ? 0 : ahora - sesion.pausadaDesde),
    pausadaDesde: null,
    detenidaEn: ahora,
  }
  activas.guardar({ ...sesiones, [mesaId]: detenida })
  registrarMovimiento({ tipo: 'detener', titulo: `Mesa ${mesaId}`, detalle: 'Tiempo detenido · por cobrar' })
  return detenida
}

// Registra el pedido en la cuenta de la mesa con el precio de ese momento.
export function agregarConsumo(mesaId: number, producto: Producto, cantidad: number) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion || cantidad < 1) return false
  const fecha = Date.now()
  const consumo: Consumo = {
    id: `${fecha}-${Math.random().toString(36).slice(2, 7)}`,
    productoId: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    precio: producto.precio,
    cantidad,
    fecha,
  }
  activas.guardar({ ...sesiones, [mesaId]: { ...sesion, consumos: [...(sesion.consumos ?? []), consumo] } })
  registrarMovimiento({
    tipo: 'consumo',
    titulo: `Mesa ${mesaId}`,
    detalle: `${cantidad} × ${producto.nombre} · ${formatearPesos(cantidad * producto.precio)}`,
  })
  notificar(
    sesion.clienteId,
    'mesa',
    `Pedido agregado · ${producto.nombre}`,
    `Sumamos ${cantidad} × ${producto.nombre} (${formatearPesos(cantidad * producto.precio)}) a la cuenta de tu mesa.`,
    '/cliente/consumos',
  )
  return true
}

// Para corregir un pedido registrado por error.
export function quitarConsumo(mesaId: number, consumoId: string) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion?.consumos) return
  activas.guardar({ ...sesiones, [mesaId]: { ...sesion, consumos: sesion.consumos.filter((c) => c.id !== consumoId) } })
}

// Por si se pulsó Finalizar por error: el rato que estuvo detenida no se cobra.
export function reanudarDetenida(mesaId: number) {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion?.detenidaEn) return
  activas.guardar({
    ...sesiones,
    [mesaId]: { ...sesion, pausadoMs: sesion.pausadoMs + (Date.now() - sesion.detenidaEn), detenidaEn: null },
  })
  registrarMovimiento({ tipo: 'reanudar', titulo: `Mesa ${mesaId}`, detalle: 'Sesión reanudada' })
}

export function finalizarSesion(mesaId: number, cuenta: CuentaMesa, metodoPago: MetodoPago): SesionFinalizada | null {
  const sesiones = activas.obtener()
  const sesion = sesiones[mesaId]
  if (!sesion?.detenidaEn) return null
  const finalizada: SesionFinalizada = {
    ...sesion,
    fin: sesion.detenidaEn,
    tiempoMs: cuenta.tiempoMs,
    total: cuenta.total,
    metodoPago,
    subtotal: cuenta.subtotal,
    gratisMs: cuenta.gratisMs,
    descuento: cuenta.descuento,
    descuentoBar: cuenta.descuentoBar,
    planId: cuenta.plan?.id ?? null,
  }
  finalizadas.guardar([...finalizadas.obtener(), finalizada])
  const { [mesaId]: _omit, ...resto } = sesiones
  activas.guardar(resto)
  registrarMovimiento({
    tipo: 'fin',
    titulo: `Mesa ${mesaId}`,
    detalle: `Sesión finalizada · ${formatearPesos(finalizada.total)}`,
  })
  const ahorro = cuenta.subtotal - cuenta.total
  notificar(
    sesion.clienteId,
    'factura',
    `Recibo de pago · Mesa ${mesaId}`,
    `${cuenta.modoCobro === 'partida' ? `${cuenta.partidas} partidas` : `Jugaste ${formatearDuracion(cuenta.tiempoMs)}`}. ` +
      (cuenta.consumos > 0 ? `Consumos: ${formatearPesos(cuenta.consumos)}. ` : '') +
      `Total pagado: ${formatearPesos(cuenta.total)}${ahorro > 0 ? ` (ahorraste ${formatearPesos(ahorro)} con tu membresía)` : ''}.`,
    '/cliente/historial',
  )
  return finalizada
}

export function sesionDelCliente(sesiones: SesionesPorMesa, clienteId: number | undefined) {
  if (clienteId === undefined) return undefined
  return Object.values(sesiones).find((s) => s?.clienteId === clienteId)
}
