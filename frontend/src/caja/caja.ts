import { pedir } from '../api/cliente'
import { registrarMovimiento } from '../actividad/movimientos'
import type { Caja, CajaCerrada, Egreso, MetodoPago, Pago, Usuario } from '../types'
import { formatearPesos } from '../utils/formato'
import { crearStoreLocal } from '../utils/storeLocal'
import { crearStoreMemoria } from '../utils/storeMemoria'

export const NOMBRES_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

// Cada cuánto se vuelve a pedir la caja (varios empleados pueden cobrar a la vez).
const REFRESCO_MS = 10_000

// Antes vivían en el navegador; ahora están en MySQL. Se limpian una vez.
for (const clave of ['billar.caja', 'billar.cajas-cerradas']) localStorage.removeItem(clave)

// La caja del turno (o null si está cerrada) y, solo para el administrador, los turnos cerrados.
const abierta = crearStoreMemoria<Caja | null>(null)
const cerradas = crearStoreMemoria<CajaCerrada[]>([])

// TEMPORAL hasta pasar las mesas al backend (paso 4b): de qué mesa es cada cobro, para poder anularlo
// y devolver la mesa a "Por cobrar". Las sesiones de mesa todavía viven en el navegador.
const pagosDeMesa = crearStoreLocal<Partial<Record<number, NonNullable<Pago['mesa']>>>>('billar.pagos-mesa', {})

export const useCaja = abierta.useValor
export const useCajasCerradas = cerradas.useValor

let yo: Usuario | null = null
let refresco: number | undefined

function conMesa(caja: Caja): Caja {
  const mesas = pagosDeMesa.obtener()
  return { ...caja, pagos: caja.pagos.map((p) => (mesas[p.id] ? { ...p, mesa: mesas[p.id] } : p)) }
}

async function recargar() {
  if (yo?.rol !== 'admin') return
  const caja = await pedir<Caja | null>('/caja')
  abierta.guardar(caja && conMesa(caja))
  if (yo.cargo === 'administrador') cerradas.guardar(await pedir<CajaCerrada[]>('/caja/cierres'))
}

// Para quien cobra por otra ruta (por ejemplo, la membresía) y necesita ver el pago en la caja.
export function refrescarCaja() {
  return recargar()
}

// Lo llama AuthContext al iniciar sesión. Los clientes no ven la caja.
export function cargarCaja(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refresco)
  if (usuario.rol !== 'admin') return Promise.resolve()
  refresco = window.setInterval(() => recargar().catch(() => {}), REFRESCO_MS)
  return recargar()
}

export function vaciarCaja() {
  yo = null
  window.clearInterval(refresco)
  abierta.guardar(null)
  cerradas.guardar([])
}

// Los movimientos también se guardan en MySQL; la lista local alimenta "Últimos movimientos" hasta el
// paso 7.

export async function abrirCaja(base: number) {
  await pedir('/caja/abrir', { cuerpo: { base } })
  await recargar()
  registrarMovimiento({ tipo: 'caja', titulo: 'Caja abierta', detalle: `Base ${formatearPesos(base)}` })
}

// Si el arqueo no cuadra, el backend exige la observación.
export async function cerrarCaja(contado: number, nota: string) {
  const caja = abierta.obtener()
  const diferencia = caja ? contado - efectivoEsperado(caja) : 0
  await pedir('/caja/cerrar', { cuerpo: { contado, nota } })
  await recargar()
  registrarMovimiento({
    tipo: 'caja',
    titulo: 'Caja cerrada',
    detalle: diferencia === 0 ? 'Arqueo cuadrado' : `${diferencia > 0 ? 'Sobrante' : 'Faltante'} de ${formatearPesos(Math.abs(diferencia))}`,
  })
}

export function textoDiferencia(diferencia: number) {
  if (diferencia === 0) return 'Cuadra exacto'
  return `${diferencia > 0 ? 'Sobran' : 'Faltan'} ${formatearPesos(Math.abs(diferencia))}`
}

type NuevoPago = Pick<Pago, 'concepto' | 'cliente' | 'monto' | 'metodo' | 'recibido' | 'mesa'> & { clienteId?: number | null }

// El backend calcula el cambio y rechaza el cobro si la caja está cerrada o el efectivo no alcanza.
export async function registrarPago({ mesa, ...pago }: NuevoPago): Promise<Pago> {
  const nuevo = await pedir<Pago>('/caja/pagos', { cuerpo: pago })
  if (mesa) pagosDeMesa.guardar({ ...pagosDeMesa.obtener(), [nuevo.id]: mesa })
  await recargar()
  registrarMovimiento({
    tipo: 'pago',
    titulo: `Cobro · ${pago.concepto}`,
    detalle: `${NOMBRES_METODO[pago.metodo]} · ${formatearPesos(pago.monto)}`,
  })
  return { ...nuevo, mesa }
}

// Dinero que sale del cajón: compras, servicios, mantenimiento, devoluciones...
export async function registrarEgreso(concepto: string, monto: number): Promise<Egreso> {
  const nuevo = await pedir<Egreso>('/caja/egresos', { cuerpo: { concepto, monto } })
  await recargar()
  registrarMovimiento({ tipo: 'caja', titulo: 'Egreso', detalle: `${concepto} · ${formatearPesos(monto)}` })
  return nuevo
}

export function puedeAnularse(pago: Pago) {
  return pago.metodo !== 'efectivo'
}

// El datáfono o el banco rechazó el pago después de registrarlo (solo el administrador). Sale de los
// pagos y queda en `anulados` como registro. El efectivo no se anula: ese dinero sí entró al cajón.
export async function anularPago(pago: Pago) {
  await pedir(`/caja/pagos/${pago.id}/anular`, { metodo: 'POST' })
  await recargar()
  registrarMovimiento({
    tipo: 'pago',
    titulo: `Cobro anulado · ${pago.concepto}`,
    detalle: `${NOMBRES_METODO[pago.metodo]} rechazada · ${formatearPesos(pago.monto)}`,
  })
}

export function totalEgresos(caja: Caja) {
  return (caja.egresos ?? []).reduce((total, e) => total + e.monto, 0)
}

export function totalPorMetodo(caja: Caja, metodo: MetodoPago) {
  return caja.pagos.filter((p) => p.metodo === metodo).reduce((total, p) => total + p.monto, 0)
}

// Los egresos se pagan en efectivo desde el cajón.
export function efectivoEsperado(caja: Caja) {
  return caja.base + totalPorMetodo(caja, 'efectivo') - totalEgresos(caja)
}
