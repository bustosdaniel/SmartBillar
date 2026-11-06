import { pedir } from '../api/cliente'
import { refrescarCaja } from '../caja/caja'
import { registrarMovimiento } from '../actividad/movimientos'
import { notificar, notificarAdministradores } from '../notificaciones/notificaciones'
import { formatearFecha } from '../utils/formato'
import type { EstadoMembresia, Membresia, MetodoPago, Plan, PlanId, SolicitudMembresia, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

const DIA = 24 * 60 * 60 * 1000
const AVISO_VENCIMIENTO = 7 * DIA
// Cada cuánto se vuelven a pedir al backend (para ver las solicitudes nuevas sin recargar).
const REFRESCO_MS = 10_000

export const PLAN_IDS: PlanId[] = ['basica', 'premium', 'gold']

// Valores con los que arranca la pantalla mientras llegan los del backend (iguales a los seeds).
const planesIniciales: Record<PlanId, Plan> = {
  basica: {
    id: 'basica',
    nombre: 'Básica',
    precioMensual: 30000,
    descuentoMesa: 5,
    horasGratisMes: 0,
    descuentoBar: 0,
    descuentoTorneo: 0,
    extras: [],
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioMensual: 60000,
    descuentoMesa: 15,
    horasGratisMes: 2,
    descuentoBar: 5,
    descuentoTorneo: 50,
    extras: [],
  },
  gold: {
    id: 'gold',
    nombre: 'Gold',
    precioMensual: 100000,
    descuentoMesa: 25,
    horasGratisMes: 5,
    descuentoBar: 10,
    descuentoTorneo: 100,
    extras: [],
  },
}

type PorCliente<T> = Partial<Record<number, T>>

// Antes vivían en el navegador; ahora están en MySQL. Se limpian una vez.
for (const clave of ['billar.planes', 'billar.membresias', 'billar.solicitudes-membresia']) localStorage.removeItem(clave)

// Planes, membresías y solicitudes viven en MySQL. El personal recibe todas; un cliente, solo las suyas.
const planes = crearStoreMemoria<Record<PlanId, Plan>>(planesIniciales)
const membresias = crearStoreMemoria<PorCliente<Membresia>>({})
const solicitudes = crearStoreMemoria<PorCliente<SolicitudMembresia>>({})

export const usePlanes = planes.useValor
export const useMembresias = membresias.useValor
export const useSolicitudes = solicitudes.useValor

const porCliente = <T extends { clienteId: number }>(lista: T[]): PorCliente<T> =>
  Object.fromEntries(lista.map((x) => [x.clienteId, x]))

let yo: Usuario | null = null
let refresco: number | undefined

async function recargar() {
  if (!yo) return
  const lista = await pedir<Plan[]>('/membresias/planes')
  planes.guardar(Object.fromEntries(lista.map((p) => [p.id, p])) as Record<PlanId, Plan>)
  if (yo.rol === 'admin') {
    const [todas, pendientes] = await Promise.all([
      pedir<Membresia[]>('/membresias'),
      pedir<SolicitudMembresia[]>('/membresias/solicitudes'),
    ])
    membresias.guardar(porCliente(todas))
    solicitudes.guardar(porCliente(pendientes))
  } else {
    const mia = await pedir<{ membresia: Membresia | null; solicitud: SolicitudMembresia | null }>('/membresias/mia')
    membresias.guardar(mia.membresia ? { [mia.membresia.clienteId]: mia.membresia } : {})
    solicitudes.guardar(mia.solicitud ? { [mia.solicitud.clienteId]: mia.solicitud } : {})
  }
}

// Lo llama AuthContext al iniciar sesión; se refresca solo mientras la sesión siga abierta.
export function cargarMembresias(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refresco)
  refresco = window.setInterval(() => recargar().catch(() => {}), REFRESCO_MS)
  return recargar()
}

export function vaciarMembresias() {
  yo = null
  window.clearInterval(refresco)
  planes.guardar(planesIniciales)
  membresias.guardar({})
  solicitudes.guardar({})
}

// Los avisos se guardan en MySQL (backend) y, hasta conectar las notificaciones (paso 7), también en la
// bandeja local del navegador, que es la que muestran las pantallas.

export async function solicitarPlan(cliente: { id: number; nombre: string }, planId: PlanId) {
  await pedir('/membresias/mia/solicitud', { cuerpo: { planId } })
  await recargar()
  const plan = planes.obtener()[planId].nombre
  registrarMovimiento({ tipo: 'caja', titulo: 'Solicitud de membresía', detalle: `${cliente.nombre} · ${plan}` })
  notificarAdministradores(
    'membresia',
    'Nueva solicitud de membresía',
    `${cliente.nombre} solicitó el plan ${plan}. Revisa la solicitud en Membresías y actívala al recibir el pago en caja.`,
    '/admin/membresias',
  )
}

// El cliente cancela su solicitud, o el personal (administrador o cajero) la rechaza.
export async function cancelarSolicitud(clienteId: number, origen: 'cliente' | 'admin') {
  const solicitud = solicitudes.obtener()[clienteId]
  await pedir(origen === 'cliente' ? '/membresias/mia/solicitud' : `/membresias/solicitudes/${clienteId}`, {
    metodo: 'DELETE',
  })
  await recargar()
  if (!solicitud) return
  const plan = planes.obtener()[solicitud.planId].nombre
  if (origen === 'cliente') {
    notificarAdministradores(
      'membresia',
      'Solicitud de membresía cancelada',
      `${solicitud.clienteNombre} canceló su solicitud del plan ${plan}.`,
      '/admin/membresias',
    )
  } else {
    notificar(
      clienteId,
      'membresia',
      `Solicitud del plan ${plan} rechazada`,
      'El club no aprobó tu solicitud. Si tienes dudas, acércate a la caja o elige otro plan.',
      '/cliente/membresia',
    )
  }
}

// Solo el administrador (el backend lo verifica).
export async function actualizarPlan(plan: Plan) {
  const { id, nombre: _nombre, ...datos } = plan
  await pedir(`/membresias/planes/${id}`, { metodo: 'PUT', cuerpo: datos })
  await recargar()
}

// Administrador o cajero: el backend cobra en caja y activa en la misma transacción (si el cobro falla,
// no se activa nada). Si renueva el mismo plan antes de vencer, suma los 30 días al vencimiento actual.
export async function asignarMembresia(
  cliente: { id: number; nombre: string },
  planId: PlanId,
  pago: { metodo: MetodoPago; recibido: number | null },
) {
  const nueva = await pedir<Membresia>('/membresias', { cuerpo: { clienteId: cliente.id, planId, pago } })
  await Promise.all([recargar(), refrescarCaja()])
  const plan = planes.obtener()[planId]
  notificar(
    cliente.id,
    'membresia',
    `Tu membresía ${plan.nombre} está activa`,
    `Disfruta tus beneficios hasta el ${formatearFecha(nueva.vence)}: ${plan.descuentoMesa}% en mesa` +
      `${plan.horasGratisMes > 0 ? ` y ${plan.horasGratisMes} h gratis al mes` : ''}.`,
    '/cliente/membresia',
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
  membresias: PorCliente<Membresia>,
  planes: Record<PlanId, Plan>,
  clienteId: number | null,
  ahora: number,
): Plan | null {
  if (clienteId === null) return null
  const membresia = membresias[clienteId]
  if (!membresia || estadoMembresia(membresia, ahora) === 'vencida') return null
  return planes[membresia.planId]
}
