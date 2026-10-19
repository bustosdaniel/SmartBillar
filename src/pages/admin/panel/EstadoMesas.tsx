import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { mesasMock, TEXTO_ESTADO_MESA } from '../../../mesas/datos'
import { IMAGEN_MODO } from '../../../mesas/imagenes'
import { estadoMesa, tiempoJugado, useSesiones } from '../../../mesas/sesiones'
import { formatearDuracion } from '../../../utils/formato'

export function EstadoMesas({ ahora }: { ahora: number }) {
  const sesiones = useSesiones()

  return (
    <section className="tarjeta panel-bloque">
      <header className="panel-bloque-cabecera">
        <h2>Estado de mesas</h2>
        <Link to="/admin/mesas">Ver todas</Link>
      </header>
      <div className="grid-mini-mesas">
        {mesasMock.map((mesa) => {
          const sesion = sesiones[mesa.id]
          const estado = estadoMesa(sesion)
          return (
            <Link key={mesa.id} to="/admin/mesas" className={`mini-mesa mini-mesa-${estado}`}>
              <div className="mini-mesa-cabecera">
                <strong>{mesa.id}</strong>
                <img src={IMAGEN_MODO[mesa.modo]} alt="" />
              </div>
              <span className={`estado estado-${estado}`}>{TEXTO_ESTADO_MESA[estado]}</span>
              {sesion && (
                <span className="mini-mesa-tiempo">
                  <Clock size={13} aria-hidden="true" />
                  {formatearDuracion(tiempoJugado(sesion, ahora))}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
