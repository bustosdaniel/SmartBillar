import { pedir } from '../api/cliente'
import { refrescarCaja } from '../caja/caja'
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

// El backend genera los avisos de membresías en la misma transacción de cada operación.

export async function solicitarPlan(planId: PlanId) {
  await pedir('/membresias/mia/solicitud', { cuerpo: { planId } })
  await recargar()
}

// El cliente cancela su solicitud, o el personal (administrador o cajero) la rechaza.
export async function cancelarSolicitud(clienteId: number, origen: 'cliente' | 'admin') {
  await pedir(origen === 'cliente' ? '/membresias/mia/solicitud' : `/membresias/solicitudes/${clienteId}`, {
    metodo: 'DELETE',
  })
  await recargar()
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
  cliente: { id: number },
  planId: PlanId,
  pago: { metodo: MetodoPago; recibido: number | null },
) {
  const nueva = await pedir<Membresia>('/membresias', { cuerpo: { clienteId: cliente.id, planId, pago } })
  await Promise.all([recargar(), refrescarCaja()])
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
