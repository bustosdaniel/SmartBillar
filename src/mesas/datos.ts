import type { EstadoMesa, Mesa, ModoJuego } from '../types'

export const NOMBRES_MODO: Record<ModoJuego, string> = {
  pool: 'Pool',
  'tres-bandas': 'Tres Bandas',
  libre: 'Libre',
}

export const TEXTO_ESTADO_MESA: Record<EstadoMesa, string> = {
  libre: 'Disponible',
  'en-uso': 'En uso',
  pausada: 'Pausada',
  'por-cobrar': 'Por cobrar',
}

export const DESCRIPCION_MODO: Record<ModoJuego, string> = {
  pool: 'Bola 8 y bola 9 en mesa con troneras. Mete tus bolas y cierra con la 8.',
  'tres-bandas': 'Carambola: tu bola debe tocar tres bandas antes de llegar a la última bola.',
  libre: 'Carambola libre: toca las otras dos bolas con la tuya, sin condición de bandas.',
}

export const MODOS: ModoJuego[] = ['pool', 'tres-bandas', 'libre']

// Equipo de alta gama de cada modo (texto para los clientes). Diamond fue el proveedor oficial
// de mesas del US Open 9-Ball; Verhoeven y Gabriels son referentes en carambola.
export const EQUIPO_MODO: Record<ModoJuego, { mesa: string; detalle: string }> = {
  pool: {
    mesa: 'Diamond Professional 9 pies',
    detalle: 'La marca de mesas del US Open 9-Ball · paño Simonis 860 · bolas Aramith Tournament',
  },
  'tres-bandas': {
    mesa: 'Verhoeven 10 pies, banda calefactada',
    detalle: 'Mesa de match europea, referente del tres bandas · paño Simonis 300 Rapide',
  },
  libre: {
    mesa: 'Gabriels de carambola',
    detalle: 'Mesas belgas presentes en torneos internacionales · bolas Aramith Super Pro',
  },
}

// Datos de prueba mientras el backend no está listo. Las tarifas están en src/mesas/tarifas.ts.
export const mesasMock: Mesa[] = [
  { id: 1, nombre: 'Mesa 1', modo: 'pool' },
  { id: 2, nombre: 'Mesa 2', modo: 'pool' },
  { id: 3, nombre: 'Mesa 3', modo: 'pool' },
  { id: 4, nombre: 'Mesa 4', modo: 'pool' },
  { id: 5, nombre: 'Mesa 5', modo: 'tres-bandas' },
  { id: 6, nombre: 'Mesa 6', modo: 'tres-bandas' },
  { id: 7, nombre: 'Mesa 7', modo: 'libre' },
  { id: 8, nombre: 'Mesa 8', modo: 'libre' },
]

export function mesasDeModo(modo: ModoJuego) {
  return mesasMock.filter((m) => m.modo === modo).length
}
