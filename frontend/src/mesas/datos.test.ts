import { describe, expect, it } from 'vitest'
import type { Mesa } from '../types'
import { nombreSugerido, numeroDeMesa } from './datos'

const mesa = (id: number, nombre: string): Mesa => ({ id, nombre, modo: 'pool', retirada: false })

describe('nombres de mesa', () => {
  it('sugiere el primer número libre: si se borró la Mesa 9, la siguiente vuelve a ser la 9', () => {
    const activas = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11].map((n) => mesa(n + 100, `Mesa ${n}`))
    expect(nombreSugerido(activas)).toBe('Mesa 9')
    expect(nombreSugerido([])).toBe('Mesa 1')
  })

  it('la tarjeta pequeña muestra el número del nombre, no el id de la base', () => {
    expect(numeroDeMesa(mesa(15, 'Mesa 9'))).toBe('9')
    expect(numeroDeMesa(mesa(3, 'VIP'))).toBe('VIP')
  })
})
