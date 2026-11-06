import { useState } from 'react'
import { History } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { NOMBRES_METODO } from '../../caja/caja'
import { Encabezado } from '../../components/Encabezado'
import { mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { useSesionesFinalizadas } from '../../mesas/sesiones'
import { usePlanes } from '../../membresias/membresias'
import type { ModoJuego } from '../../types'
import { formatearDuracion, formatearFecha, formatearHora, formatearHorasMin, formatearPesos } from '../../utils/formato'

type Filtro = ModoJuego | 'todos'
const FILTROS: Filtro[] = ['todos', 'pool', 'tres-bandas', 'libre']

export function Historial() {
  const { usuario } = useAuth()
  const finalizadas = useSesionesFinalizadas()
  const planes = usePlanes()
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const partidas = finalizadas
    .filter((s) => s.clienteId === usuario?.id)
    .map((s) => ({ ...s, mesa: mesasMock.find((m) => m.id === s.mesaId) }))
    .filter((s) => filtro === 'todos' || s.mesa?.modo === filtro)
    .toSorted((a, b) => b.fin - a.fin)

  const horas = partidas.reduce((t, s) => t + s.tiempoMs, 0)
  const gastado = partidas.reduce((t, s) => t + s.total, 0)
  const ahorro = partidas.reduce((t, s) => t + ((s.subtotal ?? s.total) - s.total), 0)

  return (
    <section className="pagina">
      <Encabezado titulo="Historial" subtitulo="Tus partidas anteriores" />

      <div className="filtros" role="group" aria-label="Filtrar por modo de juego">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? 'activo' : ''}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {f === 'todos' ? 'Todos' : NOMBRES_MODO[f]}
          </button>
        ))}
      </div>

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Partidas</span>
          <strong>{partidas.length}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Tiempo jugado</span>
          <strong>{formatearHorasMin(horas)}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Total pagado</span>
          <strong>{formatearPesos(gastado)}</strong>
        </div>
        <div className="tarjeta dato dato-verde">
          <span>Ahorrado con membresía</span>
          <strong>{formatearPesos(ahorro)}</strong>
        </div>
      </div>

      {partidas.length === 0 ? (
        <div className="tarjeta sin-mesa">
          <History size={36} aria-hidden="true" />
          <h2>{filtro === 'todos' ? 'Aún no tienes partidas' : `Sin partidas de ${NOMBRES_MODO[filtro]}`}</h2>
          <p className="texto-suave">Cuando termines una partida en el club, aparecerá aquí con su detalle.</p>
        </div>
      ) : (
        <div className="tarjeta panel-bloque">
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mesa</th>
                  <th>Modo</th>
                  <th className="numero">Tiempo</th>
                  <th>Pago</th>
                  <th className="numero">Ahorro</th>
                  <th className="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                {partidas.map((s) => {
                  const ahorroPartida = (s.subtotal ?? s.total) - s.total
                  return (
                    <tr key={`${s.mesaId}-${s.inicio}`}>
                      <td>
                        {formatearFecha(s.fin)}
                        <span className="texto-suave">
                          {' '}
                          · {formatearHora(s.inicio)} – {formatearHora(s.fin)}
                        </span>
                      </td>
                      <td>{s.mesa?.nombre ?? `Mesa ${s.mesaId}`}</td>
                      <td>{s.mesa ? NOMBRES_MODO[s.mesa.modo] : '—'}</td>
                      <td className="numero">{formatearDuracion(s.tiempoMs)}</td>
                      <td>
                        {NOMBRES_METODO[s.metodoPago]}
                        {s.planId && (
                          <span className={`insignia-plan insignia-${s.planId} insignia-chica`}>
                            {planes[s.planId].nombre}
                          </span>
                        )}
                      </td>
                      <td className="numero texto-ahorro">{ahorroPartida > 0 ? `−${formatearPesos(ahorroPartida)}` : '—'}</td>
                      <td className="numero">
                        <strong>{formatearPesos(s.total)}</strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
