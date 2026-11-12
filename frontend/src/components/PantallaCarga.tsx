// Mientras llegan los datos del backend tras iniciar sesión o abrir la app: así no se ven estados
// falsos ("Caja cerrada", "Sin plan", mesas vacías) durante el primer segundo.
import { IconoLogo } from './Logo'

export function PantallaCarga() {
  return (
    <div className="pantalla-carga" role="status" aria-live="polite">
      <span className="pantalla-carga-icono">
        <IconoLogo className="pantalla-carga-logo" />
        <span className="pantalla-carga-giro" aria-hidden="true" />
      </span>
      <p>Cargando…</p>
    </div>
  )
}
