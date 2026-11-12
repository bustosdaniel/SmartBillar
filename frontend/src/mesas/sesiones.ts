import { pedir } from '../api/cliente'
import { anularPago, refrescarCaja } from '../caja/caja'
import { recargarProductos } from '../consumos/productos'
import type { EstadoMesa, Mesa, MetodoPago, Pago, PlanId, Sesion, SesionFinalizada, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'
import { guardarMesas } from './datos'
import { recargarTarifas } from './tarifas'

// Mesas, sesiones, tarifas y consumos viven en MySQL. Las sesiones activas se vuelven a pedir seguido
// para que el cliente vea su mesa en vivo y dos empleados vean lo mismo; el resto, con menos frecuencia.
const REFRESCO_ACTIVAS_MS = 3_000
const REFRESCO_RESTO_MS = 30_000

// Antes vivían en el navegador. Se limpian una vez (lo que hubiera ahí no pasa a la base).
for (const clave of ['billar.sesiones', 'billar.sesiones-finalizadas', 'billar.tarifas-v2', 'billar.productos', 'billar.pagos-mesa']) {
  localStorage.removeItem(clave)
}

type SesionesPorMesa = Partial<Record<number, Sesion>>

const activas = crearStoreMemoria<SesionesPorMesa>({})
const finalizadas = crearStoreMemoria<SesionFinalizada[]>([])

export const useSesiones = activas.useValor
export const useSesionesFinalizadas = finalizadas.useValor

let yo: Usuario | null = null
let refrescoActivas: number | undefined
let refrescoResto: number | undefined

async function recargarActivas() {
  const lista = await pedir<Sesion[]>('/mesas/sesiones')
  if (yo) activas.guardar(Object.fromEntries(lista.map((s) => [s.mesaId, s])))
}

async function recargarFinalizadas() {
  const lista = await pedir<SesionFinalizada[]>('/mesas/sesiones/finalizadas')
  if (yo) finalizadas.guardar(lista)
}

async function recargarCatalogo() {
  const [mesas] = await Promise.all([pedir<Mesa[]>('/mesas'), recargarTarifas(), recargarProductos()])
  if (yo) guardarMesas(mesas)
}

// Lo llama AuthContext al iniciar sesión; se refresca solo mientras la sesión siga abierta.
export function cargarMesas(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refrescoActivas)
  window.clearInterval(refrescoResto)
  refrescoActivas = window.setInterval(() => recargarActivas().catch(() => {}), REFRESCO_ACTIVAS_MS)
  refrescoResto = window.setInterval(
    () => Promise.all([recargarFinalizadas(), recargarCatalogo()]).catch(() => {}),
    REFRESCO_RESTO_MS,
  )
  return Promise.all([recargarCatalogo(), recargarActivas(), recargarFinalizadas()])
}

export function vaciarMesas() {
  yo = null
  window.clearInterval(refrescoActivas)
  window.clearInterval(refrescoResto)
  activas.guardar({})
  finalizadas.guardar([])
}

// La respuesta de cada operación trae la sesión al día: se pone en la lista sin esperar al refresco.
function ponerSesion(sesion: Sesion) {
  activas.guardar({ ...activas.obtener(), [sesion.mesaId]: sesion })
}

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

// Se cobra por minuto iniciado, redondeado a la centena (igual que costo() del backend).
export function calcularCosto(tiempoMs: number, tarifaHora: number) {
  const minutos = Math.ceil(tiempoMs / 60000)
  return Math.round((minutos * tarifaHora) / 60 / 100) * 100
}

// Entregar las bolas: el backend congela la tarifa (con la regla de horario de ese momento).
export async function iniciarSesion(mesaId: number, clienteId: number) {
  ponerSesion(await pedir<Sesion>(`/mesas/${mesaId}/sesion`, { cuerpo: { clienteId } }))
}

export async function pausarSesion(mesaId: number) {
  ponerSesion(await pedir<Sesion>(`/mesas/${mesaId}/pausar`, { metodo: 'POST' }))
}

// Quita la pausa, o vuelve a poner en juego una mesa finalizada por error (ese rato no se cobra).
export async function reanudarSesion(mesaId: number) {
  ponerSesion(await pedir<Sesion>(`/mesas/${mesaId}/reanudar`, { metodo: 'POST' }))
}

// Finalizar congela el tiempo en todas las pantallas. Si estaba en pausa, la pausa se cierra ahí.
export async function detenerSesion(mesaId: number): Promise<Sesion> {
  const sesion = await pedir<Sesion>(`/mesas/${mesaId}/detener`, { metodo: 'POST' })
  ponerSesion(sesion)
  return sesion
}

// El nombre y el precio del producto quedan fijos al pedirlo.
export async function agregarConsumo(mesaId: number, productoId: string, cantidad: number) {
  ponerSesion(await pedir<Sesion>(`/mesas/${mesaId}/consumos`, { cuerpo: { productoId, cantidad } }))
}

// Para corregir un pedido registrado por error.
export async function quitarConsumo(mesaId: number, consumoId: number) {
  ponerSesion(await pedir<Sesion>(`/mesas/${mesaId}/consumos/${consumoId}`, { metodo: 'DELETE' }))
}

// Lo que cobró el backend: CuentaMesa (mesas/cuenta.ts) con planId en vez del plan.
export type CuentaCobrada = {
  tarifaHora: number
  tiempoMs: number
  subtotalMesa: number
  consumos: number
  subtotal: number
  planId: PlanId | null
  gratisMs: number
  valorGratis: number
  porcentaje: number
  descuento: number
  porcentajeBar: number
  descuentoBar: number
  total: number
}

export type Cobro = { pago: Pago; sesion: SesionFinalizada; cuenta: CuentaCobrada }

// El monto lo calcula el backend: aquí solo va cómo pagó el cliente. Si falla (caja cerrada, efectivo
// insuficiente), la mesa sigue Por cobrar.
export async function cobrarMesa(mesaId: number, pago: { metodo: MetodoPago; recibido: number | null }): Promise<Cobro> {
  const cobro = await pedir<Cobro>(`/mesas/${mesaId}/cobrar`, { cuerpo: { pago } })
  const { [mesaId]: _cobrada, ...resto } = activas.obtener()
  activas.guardar(resto)
  finalizadas.guardar([...finalizadas.obtener(), cobro.sesion])
  await refrescarCaja()
  return cobro
}

// El datáfono o el banco rechazó el pago después de cobrar: el backend anula el pago y devuelve la
// mesa a Por cobrar con el mismo tiempo y consumos. Devuelve un mensaje de error, o null.
export async function anularCobroMesa(pago: Pago): Promise<string | null> {
  if (!pago.sesionId) return 'Este pago no es de una mesa.'
  try {
    await anularPago(pago)
    await Promise.all([recargarActivas(), recargarFinalizadas()])
  } catch (error) {
    return error instanceof Error ? error.message : 'No se pudo anular el cobro.'
  }
  return null
}

export function sesionDelCliente(sesiones: SesionesPorMesa, clienteId: number | undefined) {
  if (clienteId === undefined) return undefined
  return Object.values(sesiones).find((s) => s?.clienteId === clienteId)
}
