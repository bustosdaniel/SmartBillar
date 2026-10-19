import { Banknote, CircleCheck, CirclePause, CirclePlay, CircleStop, Play, Trophy, Wallet, type LucideIcon } from 'lucide-react'
import { useMovimientos } from '../../../actividad/movimientos'
import type { TipoMovimiento } from '../../../types'
import { formatearHora } from '../../../utils/formato'

const ICONO_MOVIMIENTO: Record<TipoMovimiento, LucideIcon> = {
  inicio: Play,
  pausa: CirclePause,
  reanudar: CirclePlay,
  detener: CircleStop,
  fin: CircleCheck,
  pago: Banknote,
  caja: Wallet,
  torneo: Trophy,
}

export function UltimosMovimientos() {
  const movimientos = useMovimientos().slice(0, 5)

  return (
    <section className="tarjeta panel-bloque">
      <header className="panel-bloque-cabecera">
        <h2>Últimos movimientos</h2>
      </header>
      {movimientos.length === 0 ? (
        <p className="texto-suave">Todavía no hay movimientos. Inicia una mesa para verlos aquí.</p>
      ) : (
        <ul className="movimientos">
          {movimientos.map((m) => {
            const Icono = ICONO_MOVIMIENTO[m.tipo]
            return (
              <li key={m.id}>
                <span className={`movimiento-icono movimiento-${m.tipo}`}>
                  <Icono size={18} aria-hidden="true" />
                </span>
                <span className="movimiento-texto">
                  <strong>{m.titulo}</strong>
                  <span>{m.detalle}</span>
                </span>
                <time dateTime={new Date(m.fecha).toISOString()}>{formatearHora(m.fecha)}</time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
