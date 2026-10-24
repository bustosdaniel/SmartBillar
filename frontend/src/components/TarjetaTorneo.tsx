import type { ReactNode } from 'react'
import { CalendarDays, Trophy, Users } from 'lucide-react'
import { NOMBRES_MODO } from '../mesas/datos'
import { formatearFechaTorneo, NOMBRES_CATEGORIA, TEXTO_ESTADO_TORNEO } from '../torneos/torneos'
import type { Torneo } from '../types'
import { formatearPesos } from '../utils/formato'

type TarjetaTorneoProps = {
  torneo: Torneo
  precio?: ReactNode
  children?: ReactNode
}

export function TarjetaTorneo({ torneo, precio, children }: TarjetaTorneoProps) {
  return (
    <article className={`tarjeta torneo torneo-${torneo.modo}`}>
      <header className="torneo-cabecera">
        <span className={`estado torneo-estado-${torneo.estado}`}>{TEXTO_ESTADO_TORNEO[torneo.estado]}</span>
        <span className="texto-suave">
          {NOMBRES_MODO[torneo.modo]} · {NOMBRES_CATEGORIA[torneo.categoria]}
        </span>
      </header>
      <h3>{torneo.nombre}</h3>
      <ul className="torneo-datos">
        <li>
          <CalendarDays size={15} aria-hidden="true" /> {formatearFechaTorneo(torneo)}
        </li>
        <li>
          <Users size={15} aria-hidden="true" /> {torneo.jugadores.length} / {torneo.cupos} inscritos
        </li>
        <li>
          <Trophy size={15} aria-hidden="true" /> {torneo.premio}
        </li>
      </ul>
      <div className="torneo-pie">
        <span className="torneo-precio">{precio ?? formatearPesos(torneo.inscripcion)}</span>
        {children}
      </div>
    </article>
  )
}
