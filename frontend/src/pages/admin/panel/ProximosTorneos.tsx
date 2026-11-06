import { Link } from 'react-router'
import { Trophy } from 'lucide-react'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { formatearFechaTorneo, TEXTO_ESTADO_TORNEO, useTorneos } from '../../../torneos/torneos'

export function ProximosTorneos() {
  const orden = { 'en-curso': 0, inscripciones: 1, finalizado: 2 }
  const torneos = useTorneos()
    .filter((t) => t.estado !== 'finalizado')
    .toSorted((a, b) => orden[a.estado] - orden[b.estado] || a.fecha.localeCompare(b.fecha))
    .slice(0, 3)

  return (
    <section className="tarjeta panel-bloque">
      <header className="panel-bloque-cabecera">
        <h2>Torneos</h2>
        <Link to="/admin/torneos">Ver todos</Link>
      </header>
      {torneos.length === 0 ? (
        <p className="texto-suave">No hay torneos activos ni próximos.</p>
      ) : (
        <ul className="movimientos">
          {torneos.map((t) => (
            <li key={t.id}>
              <span className="movimiento-icono movimiento-torneo">
                <Trophy size={18} aria-hidden="true" />
              </span>
              <Link to={`/admin/torneos/${t.id}`} className="movimiento-texto enlace-limpio">
                <strong>{t.nombre}</strong>
                <span>
                  {NOMBRES_MODO[t.modo]} · {formatearFechaTorneo(t)} · {t.jugadores.length}/{t.cupos}
                </span>
              </Link>
              <span className={`estado torneo-estado-${t.estado}`}>{TEXTO_ESTADO_TORNEO[t.estado]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
