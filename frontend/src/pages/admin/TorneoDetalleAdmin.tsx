import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Play, Trash2, UserPlus } from 'lucide-react'
import { useEsAdministrador } from '../../auth/useAuth'
import { Llaves } from '../../components/Llaves'
import { Modal } from '../../components/Modal'
import { NOMBRES_MODO } from '../../mesas/datos'
import {
  cuposLibres,
  formatearFechaTorneo,
  iniciarTorneo,
  NOMBRES_CATEGORIA,
  TEXTO_ESTADO_TORNEO,
  useTorneos,
} from '../../torneos/torneos'
import type { Jugador } from '../../types'
import { formatearPesos } from '../../utils/formato'
import { DialogoInscribir } from './torneos/DialogoInscribir'
import { DialogoQuitar } from './torneos/DialogoQuitar'

type Dialogo = { tipo: 'inscribir' } | { tipo: 'cobrar' | 'quitar'; jugador: Jugador } | null

export function TorneoDetalleAdmin() {
  const esAdministrador = useEsAdministrador()
  const { id } = useParams()
  const torneo = useTorneos().find((t) => String(t.id) === id)
  const [dialogo, setDialogo] = useState<Dialogo>(null)

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
  const puedeIniciar = torneo.jugadores.length >= 2 && pendientes === 0
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
        <span className={`estado torneo-estado-${torneo.estado}`}>{TEXTO_ESTADO_TORNEO[torneo.estado]}</span>
      </header>

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

      {torneo.estado === 'inscripciones' ? (
        <div className="tarjeta panel-bloque">
          <header className="panel-bloque-cabecera">
            <h2>Jugadores inscritos</h2>
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
                <button type="button" className="boton boton-chico" onClick={() => iniciarTorneo(torneo.id)} disabled={!puedeIniciar}>
                  <Play size={15} aria-hidden="true" /> Iniciar torneo
                </button>
              )}
            </div>
          </header>
          {!puedeIniciar && (
            <p className="nota">
              {torneo.jugadores.length < 2
                ? 'Se necesitan al menos 2 jugadores para iniciar.'
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
                    <th>Tipo</th>
                    <th className="numero">Valor</th>
                    <th>Pago</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {torneo.jugadores.map((j) => (
                    <tr key={j.id}>
                      <td>{j.nombre}</td>
                      <td className="texto-suave">{j.clienteId === null ? 'Invitado' : 'Cliente'}</td>
                      <td className="numero">{formatearPesos(j.monto)}</td>
                      <td>
                        <span className={`estado ${j.pagado ? 'membresia-activa' : 'membresia-por-vencer'}`}>
                          {j.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="numero">
                        <div className="acciones-fila">
                          {!j.pagado && (
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
        titulo={dialogo?.tipo === 'cobrar' ? 'Cobrar inscripción' : dialogo?.tipo === 'quitar' ? 'Quitar jugador' : 'Inscribir jugador'}
        onCerrar={cerrar}
      >
        {dialogo?.tipo === 'quitar' && <DialogoQuitar torneo={torneo} jugador={dialogo.jugador} onListo={cerrar} />}
        {(dialogo?.tipo === 'inscribir' || dialogo?.tipo === 'cobrar') && (
          <DialogoInscribir torneo={torneo} pendiente={dialogo.tipo === 'cobrar' ? dialogo.jugador : undefined} onListo={cerrar} />
        )}
      </Modal>
    </section>
  )
}
