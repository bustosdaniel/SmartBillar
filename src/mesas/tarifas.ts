import type { ConfigTarifas, ModoCobro, ModoJuego, ReglaHorario, Sesion } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'

export const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const configInicial: ConfigTarifas = {
  porModo: {
    pool: { hora: 12000, partida: 5000 },
    'tres-bandas': { hora: 15000, partida: 6000 },
    libre: { hora: 10000, partida: 4000 },
  },
  reglas: [
    { id: 'hora-feliz', nombre: 'Hora feliz', dias: [1, 2, 3, 4], desde: '14:00', hasta: '17:00', ajuste: -10 },
    { id: 'noche-finde', nombre: 'Noche de fin de semana', dias: [5, 6], desde: '20:00', hasta: '02:00', ajuste: 15 },
  ],
}

const store = crearStoreLocal<ConfigTarifas>('billar.tarifas-v2', configInicial)

export const useTarifas = store.useValor
export const guardarTarifas = store.guardar
export const obtenerTarifas = store.obtener

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function reglaVigente(reglas: ReglaHorario[], fecha: number): ReglaHorario | null {
  const d = new Date(fecha)
  const ahora = d.getHours() * 60 + d.getMinutes()
  const hoy = d.getDay()
  const ayer = (hoy + 6) % 7
  return (
    reglas.find((r) => {
      const desde = minutos(r.desde)
      const hasta = minutos(r.hasta)
      if (desde < hasta) return r.dias.includes(hoy) && ahora >= desde && ahora < hasta
      // Cruza la medianoche: la parte de la madrugada pertenece al día anterior.
      return (r.dias.includes(hoy) && ahora >= desde) || (r.dias.includes(ayer) && ahora < hasta)
    }) ?? null
  )
}

const ajustar = (valor: number, ajuste: number) => Math.round((valor * (100 + ajuste)) / 100 / 100) * 100

// Precios que se congelan en la sesión al iniciar la mesa.
export function preciosAl(config: ConfigTarifas, modo: ModoJuego, fecha: number) {
  const base = config.porModo[modo]
  const regla = reglaVigente(config.reglas, fecha)
  const ajuste = regla?.ajuste ?? 0
  return { hora: ajustar(base.hora, ajuste), partida: ajustar(base.partida, ajuste), regla }
}

export function textoAjuste(ajuste: number) {
  return `${ajuste > 0 ? '+' : '−'}${Math.abs(ajuste)}%`
}

export function textoDias(dias: number[]) {
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => dias.includes(d))
    .map((d) => NOMBRES_DIA[d])
    .join(', ')
}

// Cobro de la sesión con compatibilidad para las sesiones anteriores a M2.
export function cobroDeSesion(sesion: Sesion, modo: ModoJuego): {
  modoCobro: ModoCobro
  tarifaHora: number
  precioPartida: number
  partidas: number
} {
  const base = store.obtener().porModo[modo]
  return {
    modoCobro: sesion.modoCobro ?? 'tiempo',
    tarifaHora: sesion.tarifaHora ?? base.hora,
    precioPartida: sesion.precioPartida ?? base.partida,
    partidas: sesion.partidas ?? 0,
  }
}
