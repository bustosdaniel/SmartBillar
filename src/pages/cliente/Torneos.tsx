import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { TarjetaTorneo } from '../../components/TarjetaTorneo'
import { useAhora } from '../../hooks/useAhora'
import { MODOS, NOMBRES_MODO } from '../../mesas/datos'
import { planVigente, useMembresias, usePlanes } from '../../membresias/membresias'
import { cuposLibres, inscribir, precioInscripcion, useTorneos } from '../../torneos/torneos'
import type { ModoJuego } from '../../types'
import { formatearPesos } from '../../utils/formato'
import { Retirarse } from './torneos/Retirarse'

type Filtro = ModoJuego | 'todos'

export function Torneos() {
  const { usuario } = useAuth()
  const torneos = useTorneos()
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [error, setError] = useState('')

  const plan = planVigente(membresias, planes, usuario?.id ?? null, ahora)
  const orden = { inscripciones: 0, 'en-curso': 1, finalizado: 2 }
  const lista = torneos
    .filter((t) => filtro === 'todos' || t.modo === filtro)
    .toSorted((a, b) => orden[a.estado] - orden[b.estado] || a.fecha.localeCompare(b.fecha))

  return (
    <section className="pagina">
      <Encabezado titulo="Torneos" subtitulo="Inscríbete y sigue las llaves de cada torneo" />

      <div className="filtros" role="group" aria-label="Filtrar por modo de juego">
        {(['todos', ...MODOS] as Filtro[]).map((f) => (
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

      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="texto-suave">No hay torneos de este modo por ahora.</p>
      ) : (
        <div className="grid-torneos">
          {lista.map((t) => {
            const yo = t.jugadores.find((j) => j.clienteId === usuario?.id)
            const precio = precioInscripcion(t, plan)
            const conDescuento = precio < t.inscripcion
            return (
              <TarjetaTorneo
                key={t.id}
                torneo={t}
                precio={
                  conDescuento ? (
                    <>
                      <s className="texto-suave">{formatearPesos(t.inscripcion)}</s>{' '}
                      {precio === 0 ? 'Gratis' : formatearPesos(precio)}
                      <span className={`insignia-plan insignia-${plan?.id} insignia-chica`}>{plan?.nombre}</span>
                    </>
                  ) : (
                    formatearPesos(precio)
                  )
                }
              >
                <div className="acciones-fila">
                  {t.estado === 'inscripciones' && !yo && usuario && (
                    <button
                      type="button"
                      className="boton boton-chico"
                      disabled={cuposLibres(t) <= 0}
                      onClick={() =>
                        setError(
                          inscribir(t.id, {
                            clienteId: usuario.id,
                            nombre: usuario.nombre,
                            pagado: precio === 0,
                            monto: precio,
                          }) ?? '',
                        )
                      }
                    >
                      {cuposLibres(t) <= 0 ? 'Sin cupos' : 'Inscribirme'}
                    </button>
                  )}
                  {yo && (
                    <span className={`estado ${yo.pagado ? 'membresia-activa' : 'membresia-por-vencer'}`}>
                      {yo.pagado ? 'Inscrito' : 'Paga en caja'}
                    </span>
                  )}
                  {yo && <Retirarse torneo={t} jugador={yo} />}
                  <Link to={`/cliente/torneos/${t.id}`} className="boton boton-secundario boton-chico">
                    {t.estado === 'inscripciones' ? 'Detalle' : 'Ver llaves'}
                  </Link>
                </div>
              </TarjetaTorneo>
            )
          })}
        </div>
      )}
    </section>
  )
}
