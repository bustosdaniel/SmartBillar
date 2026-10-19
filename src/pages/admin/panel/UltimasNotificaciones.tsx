import { Link } from 'react-router'
import { IconoNotificacion } from '../../../components/IconoNotificacion'
import { useNotificaciones } from '../../../notificaciones/notificaciones'
import { esMismoDia, formatearHora } from '../../../utils/formato'

export function UltimasNotificaciones({ ahora }: { ahora: number }) {
  const todas = useNotificaciones()
  const hoy = todas.filter((n) => esMismoDia(n.fecha, ahora)).length

  return (
    <section className="tarjeta panel-bloque">
      <header className="panel-bloque-cabecera">
        <h2>Notificaciones</h2>
        <Link to="/admin/notificaciones">{hoy > 0 ? `${hoy} hoy · ver todas` : 'Ver todas'}</Link>
      </header>
      {todas.length === 0 ? (
        <p className="texto-suave">Aún no se ha enviado ningún correo a los clientes.</p>
      ) : (
        <ul className="movimientos">
          {todas.slice(0, 3).map((n) => (
            <li key={n.id}>
              <IconoNotificacion tipo={n.tipo} />
              <span className="movimiento-texto">
                <strong>{n.asunto}</strong>
                <span>Para {n.nombre}</span>
              </span>
              <time dateTime={new Date(n.fecha).toISOString()}>{formatearHora(n.fecha)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
