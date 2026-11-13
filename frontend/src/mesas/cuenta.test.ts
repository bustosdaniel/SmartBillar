import { describe, expect, it } from 'vitest'
import type { Plan, Sesion, SesionFinalizada } from '../types'
import { calcularCuenta, gratisUsadoEnMes } from './cuenta'
import { calcularCosto, estadoMesa, tiempoJugado } from './sesiones'

// La misma fórmula está en el backend (services/mesas.py, calcular_cuenta), que es quien cobra:
// estos casos son los que el recibo y la vista previa deben mostrar igual.

const MIN = 60_000
const HORA = 60 * MIN

const plan = (datos: Partial<Plan>): Plan => ({
  id: 'premium',
  nombre: 'Premium',
  precioMensual: 60000,
  descuentoMesa: 0,
  horasGratisMes: 0,
  descuentoBar: 0,
  descuentoTorneo: 0,
  extras: [],
  ...datos,
})

const sesion = (datos: Partial<Sesion>): Sesion => ({
  id: 1,
  mesaId: 1,
  clienteId: 7,
  clienteNombre: 'Cliente',
  inicio: 0,
  pausadoMs: 0,
  pausadaDesde: null,
  detenidaEn: null,
  tarifaHora: 12000,
  regla: null,
  consumos: [],
  ...datos,
})

describe('calcularCosto: se cobra por minuto iniciado, redondeado a la centena', () => {
  it('sin tiempo no se cobra nada', () => {
    expect(calcularCosto(0, 12000)).toBe(0)
  })

  it('un milisegundo ya cuenta como un minuto', () => {
    expect(calcularCosto(1, 12000)).toBe(200)
  })

  it('cobra cada minuto empezado', () => {
    expect(calcularCosto(60 * MIN, 12000)).toBe(12000)
    expect(calcularCosto(60 * MIN + 1, 12000)).toBe(12200)
    expect(calcularCosto(90 * MIN, 12000)).toBe(18000)
  })

  it('redondea la mitad hacia arriba, igual que el backend', () => {
    // 15.000/h → 250 por minuto → se redondea a 300.
    expect(calcularCosto(MIN, 15000)).toBe(300)
  })
})

describe('tiempoJugado: el tiempo en pausa no se cobra', () => {
  it('cuenta desde el inicio hasta ahora', () => {
    expect(tiempoJugado(sesion({ inicio: 0 }), 30 * MIN)).toBe(30 * MIN)
  })

  it('descuenta las pausas ya cerradas', () => {
    expect(tiempoJugado(sesion({ inicio: 0, pausadoMs: 10 * MIN }), 30 * MIN)).toBe(20 * MIN)
  })

  it('mientras está en pausa, el reloj no avanza', () => {
    const pausada = sesion({ inicio: 0, pausadaDesde: 20 * MIN })
    expect(tiempoJugado(pausada, 50 * MIN)).toBe(20 * MIN)
    expect(estadoMesa(pausada)).toBe('pausada')
  })

  it('tras pulsar Finalizar, el tiempo queda congelado', () => {
    const detenida = sesion({ inicio: 0, detenidaEn: 45 * MIN })
    expect(tiempoJugado(detenida, 3 * HORA)).toBe(45 * MIN)
    expect(estadoMesa(detenida)).toBe('por-cobrar')
  })

  it('una mesa sin sesión está libre', () => {
    expect(estadoMesa(undefined)).toBe('libre')
  })
})

describe('calcularCuenta: horas gratis, descuento de mesa y de bar', () => {
  it('sin membresía se cobra la mesa más los consumos', () => {
    const cuenta = calcularCuenta(90 * MIN, 12000, null, 0, 5000)
    expect(cuenta.subtotalMesa).toBe(18000)
    expect(cuenta.descuento).toBe(0)
    expect(cuenta.total).toBe(23000)
  })

  it('aplica el % de descuento del plan sobre la mesa', () => {
    const cuenta = calcularCuenta(HORA, 12000, plan({ descuentoMesa: 25 }), 0)
    expect(cuenta.descuento).toBe(3000)
    expect(cuenta.total).toBe(9000)
  })

  it('las horas gratis cubren toda la partida si alcanzan', () => {
    // Mismo caso que se probó contra el backend: 90 min con Premium y 2 cervezas.
    const premium = plan({ descuentoMesa: 15, horasGratisMes: 2, descuentoBar: 5 })
    const cuenta = calcularCuenta(90 * MIN, 12000, premium, 2 * HORA, 12000)
    expect(cuenta.gratisMs).toBe(90 * MIN)
    expect(cuenta.valorGratis).toBe(18000)
    expect(cuenta.descuentoBar).toBe(600)
    expect(cuenta.total).toBe(11400)
  })

  it('primero gasta las horas gratis y luego aplica el % a lo que queda', () => {
    const premium = plan({ descuentoMesa: 15, horasGratisMes: 2 })
    const cuenta = calcularCuenta(3 * HORA, 12000, premium, 2 * HORA)
    expect(cuenta.subtotalMesa).toBe(36000)
    expect(cuenta.valorGratis).toBe(24000)
    expect(cuenta.descuento).toBe(1800)
    expect(cuenta.total).toBe(10200)
  })

  it('sin plan no usa horas gratis aunque se pasen', () => {
    expect(calcularCuenta(HORA, 12000, null, 5 * HORA).gratisMs).toBe(0)
  })

  it('nunca da horas gratis negativas', () => {
    expect(calcularCuenta(HORA, 12000, plan({}), -HORA).gratisMs).toBe(0)
  })
})

describe('gratisUsadoEnMes', () => {
  const finalizada = (clienteId: number, fin: number, gratisMs: number) =>
    ({ ...sesion({ clienteId }), fin, gratisMs }) as SesionFinalizada

  it('suma solo las horas gratis del mismo cliente y del mismo mes', () => {
    const noviembre = new Date(2026, 10, 10).getTime()
    const lista = [
      finalizada(7, new Date(2026, 10, 2).getTime(), HORA),
      finalizada(7, new Date(2026, 10, 9).getTime(), 30 * MIN),
      finalizada(7, new Date(2026, 9, 30).getTime(), HORA), // octubre: no cuenta
      finalizada(8, new Date(2026, 10, 5).getTime(), HORA), // otro cliente: no cuenta
    ]
    expect(gratisUsadoEnMes(lista, 7, noviembre)).toBe(90 * MIN)
  })
})
