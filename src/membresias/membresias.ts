import { registrarMovimiento } from '../actividad/movimientos'
import { notificar, notificarAdministradores } from '../notificaciones/notificaciones'
import { formatearFecha } from '../utils/formato'
import type { EstadoMembresia, Membresia, Plan, PlanId, SolicitudMembresia } from '../types'

import { crearStoreLocal } from '../utils/storeLocal'

const DIA = 24 * 60 * 60 * 1000
const DURACION = 30 * DIA
const AVISO_VENCIMIENTO = 7 * DIA

export const PLAN_IDS: PlanId[] = ['basica', 'premium', 'gold']

// Propuesta inicial: el admin puede editar precios y beneficios.
const planesIniciales: Record<PlanId, Plan> = {
  basica: {
    id: 'basica',
    nombre: 'Básica',
    precioMensual: 30000,
    descuentoMesa: 5,
    horasGratisMes: 0,
    descuentoBar: 0,
    descuentoTorneo: 0,
    extras: ['1 punto por hora jugada', 'Bono de cumpleaños: 1 hora gratis'],
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioMensual: 60000,
    descuentoMesa: 15,
    horasGratisMes: 2,
    descuentoBar: 5,
    descuentoTorneo: 50,
    extras: [
      'Préstamo de taco profesional',
      '1 invitado gratis al mes',
      '2 puntos por hora jugada',
      'Bono de cumpleaños: 1 hora gratis',
    ],
  },
  gold: {
    id: 'gold',
    nombre: 'Gold',
    precioMensual: 100000,
    descuentoMesa: 25,
    horasGratisMes: 5,
    descuentoBar: 10,
    descuentoTorneo: 100,
    extras: [
      'Elegir mesa preferida o VIP',
      'Préstamo de taco profesional',
      '2 invitados gratis al mes',
      '1 clase de entrenamiento al mes',
      '3 puntos por hora jugada',
      'Bono de cumpleaños: 1 hora gratis',
    ],
  },
}

// Miembros de prueba mientras el backend no está listo.
const hoy = Date.now()
const membresiasIniciales: Partial<Record<number, Membresia>> = {
  3: { clienteId: 3, clienteNombre: 'Juan Pérez', planId: 'premium', inicio: hoy - 10 * DIA, vence: hoy + 20 * DIA },
  4: { clienteId: 4, clienteNombre: 'Laura Gómez', planId: 'gold', inicio: hoy - 25 * DIA, vence: hoy + 5 * DIA },
}

const planes = crearStoreLocal('billar.planes', planesIniciales)
const membresias = crearStoreLocal('billar.membresias', membresiasIniciales)

const solicitudes = crearStoreLocal<Partial<Record<number, SolicitudMembresia>>>('billar.solicitudes-membresia', {})

export const usePlanes = planes.useValor
export const useMembresias = membresias.useValor
export const useSolicitudes = solicitudes.useValor

export function solicitarPlan(cliente: { id: number; nombre: string }, planId: PlanId) {
  solicitudes.guardar({
    ...solicitudes.obtener(),
    [cliente.id]: { clienteId: cliente.id, clienteNombre: cliente.nombre, planId, fecha: Date.now() },
  })
  registrarMovimiento({
    tipo: 'caja',
    titulo: 'Solicitud de membresía',
    detalle: `${cliente.nombre} · ${planes.obtener()[planId].nombre}`,
  })
  notificarAdministradores(
    'membresia',
    'Nueva solicitud de membresía',
    `${cliente.nombre} solicitó el plan ${planes.obtener()[planId].nombre}. Revisa la solicitud en Membresías y actívala al recibir el pago en caja.`,
  )
}

export function cancelarSolicitud(clienteId: number) {
  const { [clienteId]: _omit, ...resto } = solicitudes.obtener()
  solicitudes.guardar(resto)
}

export function actualizarPlan(plan: Plan) {
  planes.guardar({ ...planes.obtener(), [plan.id]: plan })
}

// Si renueva el mismo plan antes de vencer, los 30 días se suman al vencimiento actual.
export function asignarMembresia(cliente: { id: number; nombre: string }, planId: PlanId) {
  const ahora = Date.now()
  const actual = membresias.obtener()[cliente.id]
  const extiende = actual && actual.planId === planId && actual.vence > ahora
  const nueva: Membresia = {
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    planId,
    inicio: extiende ? actual.inicio : ahora,
    vence: (extiende ? actual.vence : ahora) + DURACION,
  }
  membresias.guardar({ ...membresias.obtener(), [cliente.id]: nueva })
  cancelarSolicitud(cliente.id)
  const plan = planes.obtener()[planId]
  notificar(
    cliente.id,
    'membresia',
    `Tu membresía ${plan.nombre} está activa`,
    `Disfruta tus beneficios hasta el ${formatearFecha(nueva.vence)}: ${plan.descuentoMesa}% en mesa` +
      `${plan.horasGratisMes > 0 ? ` y ${plan.horasGratisMes} h gratis al mes` : ''}.`,
  )
  return nueva
}

export function estadoMembresia(membresia: Membresia, ahora: number): EstadoMembresia {
  if (membresia.vence <= ahora) return 'vencida'
  return membresia.vence - ahora <= AVISO_VENCIMIENTO ? 'por-vencer' : 'activa'
}

export function diasRestantes(membresia: Membresia, ahora: number) {
  return Math.max(0, Math.ceil((membresia.vence - ahora) / DIA))
}

export function beneficiosDe(plan: Plan): string[] {
  const beneficios = [`${plan.descuentoMesa}% de descuento en la hora de mesa`]
  if (plan.horasGratisMes > 0) beneficios.push(`${plan.horasGratisMes} horas gratis al mes`)
  if (plan.descuentoBar > 0) beneficios.push(`${plan.descuentoBar}% de descuento en bar y tienda`)
  if (plan.descuentoTorneo >= 100) beneficios.push('Inscripción gratis a torneos')
  else if (plan.descuentoTorneo > 0) beneficios.push(`${plan.descuentoTorneo}% de descuento en torneos`)
  return [...beneficios, ...plan.extras]
}

// Plan con el que el cliente tiene beneficios ahora mismo (null si no tiene o venció).
export function planVigente(
  membresias: Partial<Record<number, Membresia>>,
  planes: Record<PlanId, Plan>,
  clienteId: number | null,
  ahora: number,
): Plan | null {
  if (clienteId === null) return null
  const membresia = membresias[clienteId]
  if (!membresia || estadoMembresia(membresia, ahora) === 'vencida') return null
  return planes[membresia.planId]
}
