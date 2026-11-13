import { describe, expect, it } from 'vitest'
import type { Partido } from '../types'
import { campeon, nombreRonda, puedeDefinirse, totalRondas } from './llaves'

let siguienteId = 1
const partido = (ronda: number, posicion: number, a: number | null, b: number | null, ganador: number | null = null): Partido => ({
  id: siguienteId++,
  ronda,
  posicion,
  a,
  b,
  mesaId: null,
  ganador,
})

// Cuadro de 4 jugadores: dos semifinales (ronda 0) y la final (ronda 1).
function cuadro({ final = null as number | null, semis = [null, null] as (number | null)[] } = {}) {
  return [partido(0, 0, 1, 2, semis[0]), partido(0, 1, 3, 4, semis[1]), partido(1, 0, semis[0], semis[1], final)]
}

describe('nombreRonda', () => {
  it('nombra las últimas rondas', () => {
    expect(nombreRonda(3, 4)).toBe('Final')
    expect(nombreRonda(2, 4)).toBe('Semifinal')
    expect(nombreRonda(1, 4)).toBe('Cuartos de final')
    expect(nombreRonda(0, 4)).toBe('Octavos de final')
  })

  it('las anteriores se numeran', () => {
    expect(nombreRonda(0, 5)).toBe('Ronda 1')
  })
})

describe('totalRondas y campeon', () => {
  it('cuenta las rondas del cuadro', () => {
    expect(totalRondas(cuadro())).toBe(2)
    expect(totalRondas([])).toBe(0)
  })

  it('no hay campeón hasta que se juega la final', () => {
    expect(campeon(cuadro({ semis: [1, 3] }))).toBeNull()
  })

  it('el campeón es el ganador de la final', () => {
    expect(campeon(cuadro({ semis: [1, 3], final: 3 }))).toBe(3)
  })
})

describe('puedeDefinirse: un resultado solo se cambia si el partido siguiente no se jugó', () => {
  it('un partido sin los dos jugadores no se puede definir', () => {
    const partidos = cuadro()
    expect(puedeDefinirse(partidos, partidos[2])).toBe(false)
  })

  it('una semifinal se puede definir mientras la final esté pendiente', () => {
    const partidos = cuadro({ semis: [1, null] })
    expect(puedeDefinirse(partidos, partidos[0])).toBe(true)
  })

  it('ya no se puede cambiar una semifinal si la final tiene ganador', () => {
    const partidos = cuadro({ semis: [1, 3], final: 1 })
    expect(puedeDefinirse(partidos, partidos[0])).toBe(false)
  })
})
