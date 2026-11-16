import { Link, useParams } from 'react-router'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { DatosTransferencia } from '../../components/DatosTransferencia'
import { Llaves } from '../../components/Llaves'
import { NOMBRES_MODO, useTodasLasMesas } from '../../mesas/datos'
import { campeon } from '../../torneos/llaves'
import {
  AVISO_CANCELADO,
  formatearFechaTorneo,
  NOMBRES_CATEGORIA,
  nombreJugador,
  TEXTO_ESTADO_TORNEO,
  textoCierreInscripciones,
  useTorneos,
} from '../../torneos/torneos'
import { formatearPesos } from '../../utils/formato'
import { Retirarse } from './torneos/Retirarse'

export function TorneoDetalle() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const torneo = useTorneos().find((t) => String(t.id) === id)
  const mesas = useTodasLasMesas()

  if (!torneo) {
    return (
      <section className="pagina">
        <Link to="/cliente/torneos" className="volver">
          <ArrowLeft size={16} aria-hidden="true" /> Torneos
        </Link>
        <p>Este torneo no existe.</p>
      </section>
    )
  }

  const yo = torneo.jugadores.find((j) => j.clienteId === usuario?.id)
  const ganador = campeon(torneo.partidos)
  const miPartido = torneo.partidos.find((p) => !p.ganador && p.a && p.b && (p.a === yo?.id || p.b === yo?.id))
  const rival = miPartido && nombreJugador(torneo, miPartido.a === yo?.id ? miPartido.b : miPartido.a)

  return (
    <section className="pagina">
      <Link to="/cliente/torneos" className="volver">
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

      {ganador && (
        <div className="aviso-campeon">
          <Trophy size={26} aria-hidden="true" />
          <span>
            Campeón: <strong>{nombreJugador(torneo, ganador)}</strong>
            {ganador === yo?.id && ' · ¡Felicitaciones!'}
          </span>
        </div>
      )}

      {miPartido && (
        <p className="aviso-claro">
          Tu próximo partido es contra <strong>{rival}</strong>
          {miPartido.mesaId !== null
            ? ` en la ${mesas.find((m) => m.id === miPartido.mesaId)?.nombre ?? 'mesa asignada'}.`
            : '. La mesa se asigna al comenzar.'}
        </p>
      )}

      {yo && !yo.pagado && (
        <>
          <p className="aviso-claro aviso-ambar">Tu inscripción está pendiente de pago: acércate a la caja.</p>
          <DatosTransferencia monto={yo.monto} nota="Si pagas por transferencia, muestra el comprobante en caja: el pago queda listo cuando el club ve llegar la plata." />
        </>
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

      {torneo.estado === 'cancelado' ? (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Torneo cancelado</h2>
          <p>{AVISO_CANCELADO}</p>
          {yo?.pagado && yo.monto > 0 && <p className="nota">Acércate a la caja para que te devuelvan la inscripción.</p>}
        </div>
      ) : torneo.estado === 'inscripciones' ? (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Inscritos</h2>
          {torneo.jugadores.length === 0 ? (
            <p className="texto-suave">Sé el primero en inscribirte.</p>
          ) : (
            <ul className="lista-inscritos">
              {torneo.jugadores.map((j) => (
                <li key={j.id} className={j.id === yo?.id ? 'resaltado' : ''}>
                  {j.nombre}
                  {j.id === yo?.id && ' (tú)'}
                </li>
              ))}
            </ul>
          )}
          <p className="nota">
            {textoCierreInscripciones(torneo)}. Ese día el torneo arranca y se publican las llaves; las inscripciones sin pagar
            vencen.
          </p>
          {yo && (
            <div className="acciones-fila acciones-izquierda">
              <Retirarse torneo={torneo} jugador={yo} conAviso />
            </div>
          )}
        </div>
      ) : (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Llaves</h2>
          <Llaves torneo={torneo} resaltar={yo?.id ?? null} />
        </div>
      )}
    </section>
  )
}
