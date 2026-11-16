import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Play, Trash2, UserPlus } from 'lucide-react'
import { useEsAdministrador } from '../../auth/useAuth'
import { Llaves } from '../../components/Llaves'
import { Modal } from '../../components/Modal'
import { NOMBRES_MODO } from '../../mesas/datos'
import {
  AVISO_CANCELADO,
  cuposLibres,
  errorEliminarTorneo,
  formatearFechaTorneo,
  iniciarTorneo,
  MINIMO_JUGADORES,
  NOMBRES_CATEGORIA,
  TEXTO_ESTADO_TORNEO,
  textoCierreInscripciones,
  useTorneos,
} from '../../torneos/torneos'
import type { Jugador } from '../../types'
import { formatearPesos } from '../../utils/formato'
import { DialogoEliminarTorneo } from './torneos/DialogoEliminarTorneo'
import { DialogoInscribir } from './torneos/DialogoInscribir'
import { DialogoQuitar } from './torneos/DialogoQuitar'

type Dialogo = { tipo: 'inscribir' | 'eliminar' } | { tipo: 'cobrar' | 'quitar'; jugador: Jugador } | null

export function TorneoDetalleAdmin() {
  const esAdministrador = useEsAdministrador()
  const { id } = useParams()
  const torneo = useTorneos().find((t) => String(t.id) === id)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [error, setError] = useState('')

  async function iniciar(torneoId: number) {
    setError('')
    try {
      await iniciarTorneo(torneoId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el torneo.')
    }
  }

  if (!torneo) {
    return (
      <section className="pagina">
        <Link to="/admin/torneos" className="volver">
          <ArrowLeft size={16} aria-hidden="true" /> Torneos
        </Link>
        <p>Este torneo no existe.</p>
      </section>
    )
  }

  const pendientes = torneo.jugadores.filter((j) => !j.pagado).length
  const puedeIniciar = torneo.jugadores.length >= MINIMO_JUGADORES && pendientes === 0
  const cancelado = torneo.estado === 'cancelado'
  const cerrar = () => setDialogo(null)

  return (
    <section className="pagina">
      <Link to="/admin/torneos" className="volver">
        <ArrowLeft size={16} aria-hidden="true" /> Torneos
      </Link>

      <header className="panel-cabecera">
        <div className="encabezado">
          <h1>{torneo.nombre}</h1>
          <p>
            {NOMBRES_MODO[torneo.modo]} · {NOMBRES_CATEGORIA[torneo.categoria]} · {formatearFechaTorneo(torneo)}
          </p>
        </div>
        <div className="acciones-cabecera">
          <span className={`estado torneo-estado-${torneo.estado}`}>{TEXTO_ESTADO_TORNEO[torneo.estado]}</span>
          {esAdministrador && torneo.estado !== 'en-curso' && torneo.estado !== 'finalizado' && (
            <button
              type="button"
              className="boton boton-peligro boton-chico"
              onClick={() => setDialogo({ tipo: 'eliminar' })}
              disabled={errorEliminarTorneo(torneo) !== null}
              title={errorEliminarTorneo(torneo) ?? undefined}
            >
              <Trash2 size={15} aria-hidden="true" /> Eliminar torneo
            </button>
          )}
        </div>
      </header>
      {esAdministrador && torneo.estado === 'inscripciones' && torneo.jugadores.length > 0 && (
        <p className="nota">{errorEliminarTorneo(torneo)}</p>
      )}

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Inscritos</span>
          <strong>
            {torneo.jugadores.length} / {torneo.cupos}
          </strong>
        </div>
        <div className="tarjeta dato">
          <span>Inscripción</span>
          <strong>{formatearPesos(torneo.inscripcion)}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Premio</span>
          <strong className="dato-texto">{torneo.premio}</strong>
        </div>
      </div>

      {torneo.estado === 'inscripciones' || cancelado ? (
        <div className="tarjeta panel-bloque">
          <header className="panel-bloque-cabecera">
            <h2>Jugadores inscritos</h2>
            {!cancelado && (
              <div className="acciones-cabecera">
                <button
                  type="button"
                  className="boton boton-secundario boton-chico"
                  onClick={() => setDialogo({ tipo: 'inscribir' })}
                  disabled={cuposLibres(torneo) <= 0}
                >
                  <UserPlus size={15} aria-hidden="true" /> Inscribir jugador
                </button>
                {esAdministrador && (
                  <button type="button" className="boton boton-chico" onClick={() => iniciar(torneo.id)} disabled={!puedeIniciar}>
                    <Play size={15} aria-hidden="true" /> Iniciar torneo
                  </button>
                )}
              </div>
            )}
          </header>
          {cancelado ? (
            <p className="aviso-claro aviso-ambar">
              {AVISO_CANCELADO}
              {torneo.jugadores.some((j) => j.pagado && j.monto > 0) &&
                ' Quita a cada jugador que pagó para devolverle su inscripción desde la caja.'}
            </p>
          ) : (
            <p className="nota">
              {textoCierreInscripciones(torneo)}. Ese día arranca solo si hay al menos {MINIMO_JUGADORES} inscritos con la
              inscripción pagada (las que no se pagaron vencen); si no, se cancela.
            </p>
          )}
          {error && (
            <p role="alert" className="alerta-clara">
              {error}
            </p>
          )}
          {!puedeIniciar && !cancelado && (
            <p className="nota">
              {torneo.jugadores.length < MINIMO_JUGADORES
                ? `Se necesitan al menos ${MINIMO_JUGADORES} jugadores para iniciar.`
                : `Hay ${pendientes} ${pendientes === 1 ? 'inscripción pendiente' : 'inscripciones pendientes'} de pago. Cóbralas antes de iniciar.`}
            </p>
          )}
          {torneo.jugadores.length === 0 ? (
            <p className="texto-suave">Aún no hay inscritos.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th className="numero">Valor</th>
                    <th>Pago</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {torneo.jugadores.map((j) => (
                    <tr key={j.id}>
                      <td>{j.nombre}</td>
                      <td className="numero">{formatearPesos(j.monto)}</td>
                      <td>
                        <span className={`estado ${j.pagado ? 'membresia-activa' : 'membresia-por-vencer'}`}>
                          {j.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="numero">
                        <div className="acciones-fila">
                          {!j.pagado && !cancelado && (
                            <button
                              type="button"
                              className="boton boton-chico"
                              onClick={() => setDialogo({ tipo: 'cobrar', jugador: j })}
                            >
                              Cobrar
                            </button>
                          )}
                          {esAdministrador && (
                            <button
                              type="button"
                              className="boton-icono boton-icono-claro"
                              aria-label={`Quitar a ${j.nombre}`}
                              onClick={() => setDialogo({ tipo: 'quitar', jugador: j })}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="tarjeta panel-bloque">
          <header className="panel-bloque-cabecera">
            <h2>Llaves</h2>
            {torneo.estado === 'en-curso' && esAdministrador && (
              <span className="nota">Asigna mesa a cada partido y marca quién ganó.</span>
            )}
          </header>
          <Llaves torneo={torneo} editable={torneo.estado === 'en-curso' && esAdministrador} />
        </div>
      )}

      <Modal
        abierto={dialogo !== null}
        titulo={
          dialogo?.tipo === 'cobrar'
            ? 'Cobrar inscripción'
            : dialogo?.tipo === 'quitar'
              ? 'Quitar jugador'
              : dialogo?.tipo === 'eliminar'
                ? 'Eliminar torneo'
                : 'Inscribir jugador'
        }
        onCerrar={cerrar}
      >
        {dialogo?.tipo === 'quitar' && <DialogoQuitar torneo={torneo} jugador={dialogo.jugador} onListo={cerrar} />}
        {dialogo?.tipo === 'eliminar' && <DialogoEliminarTorneo torneo={torneo} onListo={cerrar} />}
        {(dialogo?.tipo === 'inscribir' || dialogo?.tipo === 'cobrar') && (
          <DialogoInscribir torneo={torneo} pendiente={dialogo.tipo === 'cobrar' ? dialogo.jugador : undefined} onListo={cerrar} />
        )}
      </Modal>
    </section>
  )
}
