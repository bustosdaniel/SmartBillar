import { useNavigate } from 'react-router'
import { BellOff, ChevronRight } from 'lucide-react'
import { marcarLeida } from '../notificaciones/notificaciones'
import type { Notificacion } from '../types'
import { formatearFecha, formatearHora } from '../utils/formato'
import { IconoNotificacion } from './IconoNotificacion'

type BandejaProps = {
  notificaciones: Notificacion[]
  vacio: string
}

// Bandeja de un usuario: un clic la marca como leída y, si tiene ruta, lleva a esa vista.
export function BandejaNotificaciones({ notificaciones, vacio }: BandejaProps) {
  const navigate = useNavigate()

  if (notificaciones.length === 0) {
    return (
      <div className="tarjeta sin-mesa">
        <BellOff size={36} aria-hidden="true" />
        <h2>No tienes notificaciones</h2>
        <p className="texto-suave">{vacio}</p>
      </div>
    )
  }

  function abrir(n: Notificacion) {
    marcarLeida(n.id)
    if (n.ruta) navigate(n.ruta)
  }

  return (
    <ul className="tarjeta lista-notificaciones">
      {notificaciones.map((n) => (
        <li key={n.id} className={n.leida ? '' : 'sin-leer'}>
          <button type="button" onClick={() => abrir(n)} aria-label={n.leida ? n.asunto : `${n.asunto} (sin leer)`}>
            <IconoNotificacion tipo={n.tipo} />
            <span className="notif-texto">
              <strong>{n.asunto}</strong>
              <span>{n.mensaje}</span>
            </span>
            <time dateTime={new Date(n.fecha).toISOString()}>
              {formatearFecha(n.fecha)}
              <br />
              {formatearHora(n.fecha)}
            </time>
            {n.ruta && <ChevronRight className="notif-ir" size={18} aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
