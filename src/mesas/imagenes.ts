import imagenBandas from '../assets/images/image-bandas.png'
import imagenLibres from '../assets/images/image-libres.png'
import imagenPool from '../assets/images/image-pool.jpg'
import type { ModoJuego } from '../types'

export const IMAGEN_MODO: Record<ModoJuego, string> = {
  pool: imagenPool,
  'tres-bandas': imagenBandas,
  libre: imagenLibres,
}
