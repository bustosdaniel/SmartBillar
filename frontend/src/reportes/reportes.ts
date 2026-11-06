import type { Caja, Egreso, Pago } from '../types'

export type Periodo = 'diario' | 'semanal' | 'mensual'

export type Tramo = {
  etiqueta: string
  detalle: string
  inicio: number
  fin: number
  ingresos: number
  egresos: number
}

const DIA = 24 * 60 * 60 * 1000
const TRAMOS: Record<Periodo, number> = { diario: 7, semanal: 8, mensual: 6 }

const diaSemana = new Intl.DateTimeFormat('es-CO', { weekday: 'short' })
const diaMes = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const mes = new Intl.DateTimeFormat('es-CO', { month: 'short' })
const mesAnio = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1).replace('.', '')

function inicioDia(fecha: number) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Semanas de lunes a domingo.
function inicioSemana(fecha: number) {
  const inicio = inicioDia(fecha)
  const dia = (new Date(inicio).getDay() + 6) % 7
  return inicio - dia * DIA
}

function inicioMes(fecha: number, desplazamiento = 0) {
  const d = new Date(fecha)
  return new Date(d.getFullYear(), d.getMonth() + desplazamiento, 1).getTime()
}

function crearTramos(periodo: Periodo, ahora: number): Omit<Tramo, 'ingresos' | 'egresos'>[] {
  const n = TRAMOS[periodo]
  return Array.from({ length: n }, (_, i) => {
    const atras = n - 1 - i
    if (periodo === 'diario') {
      const inicio = inicioDia(ahora) - atras * DIA
      return { etiqueta: capitalizar(diaSemana.format(inicio)), detalle: diaMes.format(inicio), inicio, fin: inicio + DIA }
    }
    if (periodo === 'semanal') {
      const inicio = inicioSemana(ahora) - atras * 7 * DIA
      const d = new Date(inicio)
      return { etiqueta: `${d.getDate()}/${d.getMonth() + 1}`, detalle: `Semana del ${diaMes.format(inicio)}`, inicio, fin: inicio + 7 * DIA }
    }
    const inicio = inicioMes(ahora, -atras)
    return { etiqueta: capitalizar(mes.format(inicio)), detalle: mesAnio.format(inicio), inicio, fin: inicioMes(inicio, 1) }
  })
}

export function todasLasCajas(abierta: Caja | null, cerradas: Caja[]) {
  return abierta ? [...cerradas, abierta] : cerradas
}

export function reporte(cajas: Caja[], periodo: Periodo, ahora: number) {
  const pagos = cajas.flatMap((c) => c.pagos)
  const egresos = cajas.flatMap((c) => c.egresos ?? [])
  const suma = (lista: (Pago | Egreso)[], inicio: number, fin: number) =>
    lista.filter((x) => x.fecha >= inicio && x.fecha < fin).reduce((total, x) => total + x.monto, 0)

  const tramos: Tramo[] = crearTramos(periodo, ahora).map((t) => ({
    ...t,
    ingresos: suma(pagos, t.inicio, t.fin),
    egresos: suma(egresos, t.inicio, t.fin),
  }))
  const actual = tramos[tramos.length - 1]
  return {
    tramos,
    actual,
    pagos: pagos.filter((p) => p.fecha >= actual.inicio && p.fecha < actual.fin),
    egresos: egresos.filter((e) => e.fecha >= actual.inicio && e.fecha < actual.fin),
  }
}

export const NOMBRES_PERIODO: Record<Periodo, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  mensual: 'Mensual',
}

export const TEXTO_ACTUAL: Record<Periodo, string> = {
  diario: 'Hoy',
  semanal: 'Esta semana',
  mensual: 'Este mes',
}

export function categoriaPago(concepto: string) {
  if (concepto.startsWith('Mesa')) return 'Mesas'
  if (concepto.startsWith('Membresía')) return 'Membresías'
  if (concepto.startsWith('Inscripción')) return 'Torneos'
  return 'Otros'
}
