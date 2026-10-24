import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../../auth/useAuth'
import { IconoNotificacion } from '../../../components/IconoNotificacion'
import { marcarLeida, useNotificaciones } from '../../../notificaciones/notificaciones'
import type { Notificacion } from '../../../types'
import { formatearHora } from '../../../utils/formato'

// Las últimas notificaciones del admin conectado (lo que hicieron los clientes).
export function UltimasNotificaciones() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const mias = useNotificaciones().filter((n) => n.usuarioId === usuario?.id)
  const sinLeer = mias.filter((n) => !n.leida).length

  function abrir(n: Notificacion) {
    marcarLeida(n.id)
    navigate(n.ruta ?? '/admin/notificaciones')
  }

  return (
    <section className="tarjeta panel-bloque">
      <header className="panel-bloque-cabecera">
        <h2>Notificaciones</h2>
        <Link to="/admin/notificaciones">{sinLeer > 0 ? `${sinLeer} sin leer · ver todas` : 'Ver todas'}</Link>
      </header>
      {mias.length === 0 ? (
        <p className="texto-suave">Aquí verás cuando un cliente se inscriba, se retire o pida una membresía.</p>
      ) : (
        <ul className="movimientos">
          {mias.slice(0, 3).map((n) => (
            <li key={n.id} className={n.leida ? '' : 'notif-sin-leer'}>
              <button type="button" className="notif-fila" onClick={() => abrir(n)}>
                <IconoNotificacion tipo={n.tipo} />
                <span className="movimiento-texto">
                  <strong>{n.asunto}</strong>
                  <span>{n.mensaje}</span>
                </span>
                <time dateTime={new Date(n.fecha).toISOString()}>{formatearHora(n.fecha)}</time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
