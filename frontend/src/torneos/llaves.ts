import type { Partido } from '../types'

// El cuadro y los resultados los calcula el backend (services/llaves.py); aquí solo se muestran.

export function totalRondas(partidos: Partido[]) {
  return partidos.reduce((max, p) => Math.max(max, p.ronda + 1), 0)
}

export function nombreRonda(ronda: number, rondas: number) {
  const faltan = rondas - ronda
  if (faltan === 1) return 'Final'
  if (faltan === 2) return 'Semifinal'
  if (faltan === 3) return 'Cuartos de final'
  if (faltan === 4) return 'Octavos de final'
  return `Ronda ${ronda + 1}`
}

// Solo se puede cambiar un resultado mientras el partido siguiente no se haya jugado.
export function puedeDefinirse(partidos: Partido[], partido: Partido) {
  if (partido.a === null || partido.b === null) return false
  const siguiente = partidos.find((p) => p.ronda === partido.ronda + 1 && p.posicion === Math.floor(partido.posicion / 2))
  return !siguiente?.ganador
}

export function campeon(partidos: Partido[]) {
  const final = partidos.find((p) => p.ronda === totalRondas(partidos) - 1)
  return final?.ganador ?? null
}
