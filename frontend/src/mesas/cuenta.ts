import { totalConsumos } from '../consumos/productos'
import { estadoMembresia, useMembresias, usePlanes } from '../membresias/membresias'
import type { Mesa, Plan, Sesion, SesionFinalizada } from '../types'
import { calcularCosto, tiempoJugado, useSesionesFinalizadas } from './sesiones'
import { tarifaDeSesion } from './tarifas'

const HORA = 60 * 60 * 1000

export type CuentaMesa = {
  tarifaHora: number
  tiempoMs: number
  subtotalMesa: number
  consumos: number
  // Mesa + consumos antes de los beneficios de la membresía.
  subtotal: number
  plan: Plan | null
  gratisMs: number
  valorGratis: number
  porcentaje: number
  descuento: number
  porcentajeBar: number
  descuentoBar: number
  total: number
}

function mismoMes(a: number, b: number) {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()
}

// Horas gratis que el cliente ya gastó en el mes de `fecha`.
export function gratisUsadoEnMes(finalizadas: SesionFinalizada[], clienteId: number, fecha: number) {
  return finalizadas
    .filter((s) => s.clienteId === clienteId && mismoMes(s.fin, fecha))
    .reduce((total, s) => total + (s.gratisMs ?? 0), 0)
}

// Primero se descuentan las horas gratis del plan y luego el % sobre lo que queda.
// Los consumos llevan aparte el % de descuento en bar del plan.
export function calcularCuenta(
  tiempoMs: number,
  tarifaHora: number,
  plan: Plan | null,
  gratisDisponibleMs: number,
  consumos = 0,
): CuentaMesa {
  const subtotalMesa = calcularCosto(tiempoMs, tarifaHora)
  const gratisMs = plan ? Math.min(Math.max(0, gratisDisponibleMs), tiempoMs) : 0
  const valorGratis = subtotalMesa - calcularCosto(tiempoMs - gratisMs, tarifaHora)
  const porcentaje = plan?.descuentoMesa ?? 0
  const despuesDeGratis = subtotalMesa - valorGratis
  const descuento = Math.round((despuesDeGratis * porcentaje) / 100 / 100) * 100
  const porcentajeBar = plan?.descuentoBar ?? 0
  const descuentoBar = Math.round((consumos * porcentajeBar) / 100 / 100) * 100
  return {
    tarifaHora,
    tiempoMs,
    subtotalMesa,
    consumos,
    subtotal: subtotalMesa + consumos,
    plan,
    gratisMs,
    valorGratis,
    porcentaje,
    descuento,
    porcentajeBar,
    descuentoBar,
    total: despuesDeGratis - descuento + consumos - descuentoBar,
  }
}

// Devuelve una función que calcula la cuenta de una sesión con la membresía vigente del cliente.
export function useCalculadoraCuenta() {
  const membresias = useMembresias()
  const planes = usePlanes()
  const finalizadas = useSesionesFinalizadas()

  return (sesion: Sesion, mesa: Mesa, ahora: number): CuentaMesa => {
    const hasta = sesion.detenidaEn ?? ahora
    const tiempo = tiempoJugado(sesion, ahora)
    const membresia = sesion.clienteId === null ? undefined : membresias[sesion.clienteId]
    const vigente = membresia && estadoMembresia(membresia, hasta) !== 'vencida'
    const plan = vigente ? planes[membresia.planId] : null
    const disponible =
      plan && sesion.clienteId !== null
        ? plan.horasGratisMes * HORA - gratisUsadoEnMes(finalizadas, sesion.clienteId, hasta)
        : 0
    return calcularCuenta(tiempo, tarifaDeSesion(sesion, mesa.modo), plan, disponible, totalConsumos(sesion.consumos))
  }
}
