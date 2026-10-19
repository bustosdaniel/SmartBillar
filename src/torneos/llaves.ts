import type { Jugador, Partido } from '../types'

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

// Lleva al ganador al hueco que le toca en la ronda siguiente.
function avanzar(partidos: Partido[], partido: Partido): Partido[] {
  if (partido.ronda === totalRondas(partidos) - 1) return partidos
  const siguiente = partidos.find((p) => p.ronda === partido.ronda + 1 && p.posicion === Math.floor(partido.posicion / 2))
  if (!siguiente) return partidos
  const lado = partido.posicion % 2 === 0 ? 'a' : 'b'
  return partidos.map((p) => (p.id === siguiente.id ? { ...p, [lado]: partido.ganador } : p))
}

// Eliminación directa. Si los inscritos no completan una potencia de 2, los primeros
// reciben pase directo (se emparejan con un hueco vacío y avanzan solos).
export function generarLlaves(jugadores: Jugador[]): Partido[] {
  let tamano = 2
  while (tamano < jugadores.length) tamano *= 2
  const lugares = [...jugadores.map((j) => j.id), ...Array<null>(tamano - jugadores.length).fill(null)]
  const rondas = Math.log2(tamano)

  let partidos: Partido[] = []
  for (let ronda = 0; ronda < rondas; ronda++) {
    const cantidad = tamano / 2 ** (ronda + 1)
    for (let posicion = 0; posicion < cantidad; posicion++) {
      const primera = ronda === 0
      partidos.push({
        id: `r${ronda}-p${posicion}`,
        ronda,
        posicion,
        a: primera ? lugares[posicion] : null,
        b: primera ? lugares[tamano - 1 - posicion] : null,
        mesaId: null,
        ganador: null,
      })
    }
  }

  for (const partido of partidos.filter((p) => p.ronda === 0)) {
    const solo = partido.a === null ? partido.b : partido.b === null ? partido.a : null
    if (solo === null) continue
    const conPase = { ...partido, ganador: solo }
    partidos = avanzar(
      partidos.map((p) => (p.id === partido.id ? conPase : p)),
      conPase,
    )
  }
  return partidos
}

// Solo se puede cambiar un resultado mientras el partido siguiente no se haya jugado.
export function puedeDefinirse(partidos: Partido[], partido: Partido) {
  if (partido.a === null || partido.b === null) return false
  const siguiente = partidos.find((p) => p.ronda === partido.ronda + 1 && p.posicion === Math.floor(partido.posicion / 2))
  return !siguiente?.ganador
}

export function definirGanador(partidos: Partido[], partidoId: string, jugadorId: string): Partido[] {
  const partido = partidos.find((p) => p.id === partidoId)
  if (!partido || !puedeDefinirse(partidos, partido)) return partidos
  if (jugadorId !== partido.a && jugadorId !== partido.b) return partidos
  const actualizado = { ...partido, ganador: jugadorId }
  return avanzar(
    partidos.map((p) => (p.id === partidoId ? actualizado : p)),
    actualizado,
  )
}

export function campeon(partidos: Partido[]) {
  const final = partidos.find((p) => p.ronda === totalRondas(partidos) - 1)
  return final?.ganador ?? null
}
