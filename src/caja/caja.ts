import { registrarMovimiento } from '../actividad/movimientos'
import type { Caja, CajaCerrada, Egreso, MetodoPago, Pago } from '../types'
import { formatearPesos } from '../utils/formato'
import { crearStoreLocal } from '../utils/storeLocal'
import { historialDemo } from './historialDemo'

export const NOMBRES_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

const abierta = crearStoreLocal<Caja | null>('billar.caja', null)
const cerradas = crearStoreLocal<CajaCerrada[]>('billar.cajas-cerradas', historialDemo())

export const useCaja = abierta.useValor
export const useCajasCerradas = cerradas.useValor

export function abrirCaja(base: number) {
  if (abierta.obtener()) return
  abierta.guardar({ apertura: Date.now(), base, pagos: [], egresos: [] })
  registrarMovimiento({ tipo: 'caja', titulo: 'Caja abierta', detalle: `Base ${formatearPesos(base)}` })
}

export function cerrarCaja(contado: number, nota: string) {
  const caja = abierta.obtener()
  if (!caja) return
  const diferencia = contado - efectivoEsperado(caja)
  cerradas.guardar([...cerradas.obtener(), { ...caja, cierre: Date.now(), contado, nota: nota || undefined }])
  abierta.guardar(null)
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

export function registrarPago(pago: Omit<Pago, 'id' | 'fecha'>): Pago | null {
  const caja = abierta.obtener()
  if (!caja) return null
  const fecha = Date.now()
  const nuevo: Pago = { ...pago, id: `${fecha}-${Math.random().toString(36).slice(2, 7)}`, fecha }
  abierta.guardar({ ...caja, pagos: [...caja.pagos, nuevo] })
  registrarMovimiento({
    tipo: 'pago',
    titulo: `Cobro · ${pago.concepto}`,
    detalle: `${NOMBRES_METODO[pago.metodo]} · ${formatearPesos(pago.monto)}`,
  })
  return nuevo
}

// Dinero que sale del cajón: compras, servicios, mantenimiento...
export function registrarEgreso(concepto: string, monto: number): Egreso | null {
  const caja = abierta.obtener()
  if (!caja) return null
  const fecha = Date.now()
  const nuevo: Egreso = { id: `${fecha}-${Math.random().toString(36).slice(2, 7)}`, fecha, concepto, monto }
  abierta.guardar({ ...caja, egresos: [...(caja.egresos ?? []), nuevo] })
  registrarMovimiento({ tipo: 'caja', titulo: 'Egreso', detalle: `${concepto} · ${formatearPesos(monto)}` })
  return nuevo
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
