import { pedir } from '../api/cliente'
import type { ConfigTarifas, ModoJuego, ReglaHorario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

export const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Valores con los que arranca la pantalla mientras llegan los del backend (iguales a los seeds).
const configInicial: ConfigTarifas = {
  porModo: {
    pool: { hora: 12000 },
    'tres-bandas': { hora: 15000 },
    libre: { hora: 10000 },
  },
  reglas: [
    { id: 'hora-feliz', nombre: 'Hora feliz', dias: [1, 2, 3, 4], desde: '14:00', hasta: '17:00', ajuste: -10 },
    { id: 'noche-finde', nombre: 'Noche de fin de semana', dias: [5, 6], desde: '20:00', hasta: '02:00', ajuste: 15 },
  ],
}

const store = crearStoreMemoria<ConfigTarifas>(configInicial)

export const useTarifas = store.useValor
export const obtenerTarifas = store.obtener

export async function recargarTarifas() {
  store.guardar(await pedir<ConfigTarifas>('/mesas/tarifas'))
}

// Solo el administrador (el backend responde 403 al cajero). Reemplaza toda la configuración.
export async function guardarTarifas(config: ConfigTarifas) {
  store.guardar(await pedir<ConfigTarifas>('/mesas/tarifas', { metodo: 'PUT', cuerpo: config }))
}

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

// Tarifa que se congela en la sesión al iniciar la mesa.
export function preciosAl(config: ConfigTarifas, modo: ModoJuego, fecha: number) {
  const base = config.porModo[modo]
  const regla = reglaVigente(config.reglas, fecha)
  const ajuste = regla?.ajuste ?? 0
  return { hora: ajustar(base.hora, ajuste), regla }
}

const MINUTOS_DIA = 24 * 60
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Minutos de la semana (0 = domingo 00:00) que cubre la regla; la madrugada de una franja que cruza
// la medianoche cae en el día siguiente (como reglaVigente). Igual que _franjas del backend.
function franjas(r: ReglaHorario): [number, number][] {
  const desde = minutos(r.desde)
  const hasta = minutos(r.hasta)
  return r.dias.flatMap((dia): [number, number][] => {
    const inicio = dia * MINUTOS_DIA
    if (desde < hasta) return [[inicio + desde, inicio + hasta]]
    const siguiente = ((dia + 1) % 7) * MINUTOS_DIA
    return hasta > 0 ? [[inicio + desde, inicio + MINUTOS_DIA], [siguiente, siguiente + hasta]] : [[inicio + desde, inicio + MINUTOS_DIA]]
  })
}

// Si dos tarifas aplican a la misma hora solo valdría la primera: se describe el primer cruce, o null.
export function cruceDeReglas(a: ReglaHorario, b: ReglaHorario): string | null {
  if (!a.desde || !a.hasta || !b.desde || !b.hasta || a.desde === a.hasta || b.desde === b.hasta) return null
  let primero: number | null = null
  for (const x of franjas(a)) {
    for (const y of franjas(b)) {
      const inicio = Math.max(x[0], y[0])
      if (inicio < Math.min(x[1], y[1]) && (primero === null || inicio < primero)) primero = inicio
    }
  }
  if (primero === null) return null
  const dia = Math.floor(primero / MINUTOS_DIA)
  const resto = primero % MINUTOS_DIA
  const hora = `${String(Math.floor(resto / 60)).padStart(2, '0')}:${String(resto % 60).padStart(2, '0')}`
  return `Se cruza con «${b.nombre.trim() || 'otra tarifa'}» el ${DIAS_LARGOS[dia]} a las ${hora}. Ajusta los días u horas.`
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
