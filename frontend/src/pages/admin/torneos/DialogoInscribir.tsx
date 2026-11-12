import { useRef, useState } from 'react'
import { BuscarCliente } from '../../../components/BuscarCliente'
import { FormularioPago, type DatosPago } from '../../../components/FormularioPago'
import { useAhora } from '../../../hooks/useAhora'
import { planVigente, useMembresias, usePlanes } from '../../../membresias/membresias'
import { cobrarPendiente, inscribirCliente, precioInscripcion, validarInscripcion } from '../../../torneos/torneos'
import type { Jugador, Torneo, Usuario } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

type DialogoInscribirProps = {
  torneo: Torneo
  // Si llega, se cobra la inscripción pendiente de ese jugador en vez de inscribir uno nuevo.
  pendiente?: Jugador
  onListo: () => void
}

export function DialogoInscribir({ torneo, pendiente, onListo }: DialogoInscribirProps) {
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()
  const [cliente, setCliente] = useState<Usuario | null>(null)
  const [error, setError] = useState('')
  const [inscribiendo, setInscribiendo] = useState(false)
  const enCurso = useRef(false)

  const clienteId = pendiente ? pendiente.clienteId : (cliente?.id ?? null)
  const plan = planVigente(membresias, planes, clienteId, ahora)
  const precio = pendiente ? pendiente.monto : precioInscripcion(torneo, plan)
  // Sin cliente elegido todavía no hay nada que validar.
  const errorPrevio = pendiente || !cliente ? null : validarInscripcion(torneo, clienteId)
  const listo = !!pendiente || !!cliente

  async function completar(datos: DatosPago | null) {
    if (!listo || errorPrevio || enCurso.current) return
    enCurso.current = true
    setInscribiendo(true)
    setError('')
    try {
      if (pendiente) await cobrarPendiente(torneo.id, pendiente.id, datos)
      else if (cliente) await inscribirCliente(torneo.id, cliente.id, datos)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la inscripción.')
    } finally {
      enCurso.current = false
      setInscribiendo(false)
    }
  }

  return (
    <div className="formulario-claro">
      {pendiente ? (
        <p>
          Cobrar la inscripción de <strong>{pendiente.nombre}</strong>.
        </p>
      ) : (
        <BuscarCliente
          cliente={cliente}
          onCambio={(c) => {
            setCliente(c)
            setError('')
          }}
          mensajeEncontrado="Cliente encontrado."
        />
      )}

      <dl className="resumen">
        <div>
          <dt>Inscripción</dt>
          <dd>{formatearPesos(torneo.inscripcion)}</dd>
        </div>
        {plan && plan.descuentoTorneo > 0 && !pendiente && (
          <div className="linea-descuento">
            <dt>
              Descuento {plan.nombre} ({Math.min(100, plan.descuentoTorneo)}%)
            </dt>
            <dd>−{formatearPesos(torneo.inscripcion - precio)}</dd>
          </div>
        )}
        <div className="resumen-total">
          <dt>Total</dt>
          <dd>{formatearPesos(precio)}</dd>
        </div>
      </dl>

      {(errorPrevio || error) && (
        <p role="alert" className="alerta-clara">
          {errorPrevio ?? error}
        </p>
      )}

      {listo &&
        !errorPrevio &&
        (precio === 0 ? (
          <div className="dialogo-acciones">
            <button type="button" className="boton boton-secundario" onClick={onListo} disabled={inscribiendo}>
              Cancelar
            </button>
            <button type="button" className="boton" onClick={() => completar(null)} disabled={inscribiendo}>
              {inscribiendo ? 'Inscribiendo…' : 'Inscribir sin costo'}
            </button>
          </div>
        ) : (
          <FormularioPago key={clienteId} total={precio} onCancelar={onListo} onPagar={completar} />
        ))}
    </div>
  )
}
