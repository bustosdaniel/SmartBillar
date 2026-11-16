import imagenBandas from '../assets/images/3_Bandas.png'
import imagenLibres from '../assets/images/Libres.png'
import imagenPool from '../assets/images/image-pool.jpg'
import type { ModoJuego } from '../types'

export const IMAGEN_MODO: Record<ModoJuego, string> = {
  pool: imagenPool,
  'tres-bandas': imagenBandas,
  libre: imagenLibres,
}
