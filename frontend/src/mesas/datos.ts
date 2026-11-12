import { pedir } from '../api/cliente'
import type { EstadoMesa, Mesa, ModoJuego } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

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

// Las mesas del club viven en MySQL (GET /mesas); se cargan al iniciar sesión (mesas/sesiones.ts).
// Incluye las retiradas, que solo sirven para mostrar el nombre en el historial.
const mesas = crearStoreMemoria<Mesa[]>([])

export const useTodasLasMesas = mesas.useValor
export const guardarMesas = mesas.guardar

// Las que se pueden usar hoy (sin las retiradas).
export function useMesas() {
  return useTodasLasMesas().filter((m) => !m.retirada)
}

// Solo el administrador. El nombre no se puede repetir entre las mesas activas.
export async function crearMesa(nombre: string, modo: ModoJuego) {
  const nueva = await pedir<Mesa>('/mesas', { cuerpo: { nombre, modo } })
  mesas.guardar([...mesas.obtener(), nueva])
  return nueva
}

// Solo el administrador. Si nunca se usó se borra; si tiene historial, queda retirada.
export async function eliminarMesa(mesaId: number) {
  const { modo } = await pedir<{ modo: 'borrada' | 'retirada' }>(`/mesas/${mesaId}`, { metodo: 'DELETE' })
  mesas.guardar(
    modo === 'borrada'
      ? mesas.obtener().filter((m) => m.id !== mesaId)
      : mesas.obtener().map((m) => (m.id === mesaId ? { ...m, retirada: true } : m)),
  )
}

// Siguiente nombre libre, para sugerirlo al agregar una mesa ("Mesa 9").
export function nombreSugerido(lista: Mesa[]) {
  const usados = new Set(lista.map((m) => m.nombre.toLowerCase()))
  let n = lista.length + 1
  while (usados.has(`mesa ${n}`)) n++
  return `Mesa ${n}`
}
