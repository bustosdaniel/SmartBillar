import { useState } from 'react'
import { registrarPago } from '../../../caja/caja'
import { BuscarCliente } from '../../../components/BuscarCliente'
import { FormularioPago, type DatosPago } from '../../../components/FormularioPago'
import { useAhora } from '../../../hooks/useAhora'
import { planVigente, useMembresias, usePlanes } from '../../../membresias/membresias'
import { inscribir, marcarPagado, precioInscripcion, validarInscripcion } from '../../../torneos/torneos'
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

  const clienteId = pendiente ? pendiente.clienteId : (cliente?.id ?? null)
  const nombre = pendiente ? pendiente.nombre : (cliente?.nombre ?? '')
  const plan = planVigente(membresias, planes, clienteId, ahora)
  const precio = pendiente ? pendiente.monto : precioInscripcion(torneo, plan)
  // Sin cliente aún no se valida (validarInscripcion acepta null para los invitados antiguos).
  const errorPrevio = pendiente || !cliente ? null : validarInscripcion(torneo, clienteId)
  const listo = !!pendiente || !!cliente

  function completar(datos: DatosPago | null) {
    if (!listo || errorPrevio) return
    if (datos && precio > 0) {
      const pago = registrarPago({ ...datos, concepto: `Inscripción ${torneo.nombre}`, cliente: nombre, monto: precio })
      if (!pago) return
    }
    if (pendiente) {
      marcarPagado(torneo.id, pendiente.id)
    } else {
      const fallo = inscribir(torneo.id, { clienteId, nombre, pagado: true, monto: precio })
      if (fallo) {
        setError(fallo)
        return
      }
    }
    onListo()
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
            <button type="button" className="boton boton-secundario" onClick={onListo}>
              Cancelar
            </button>
            <button type="button" className="boton" onClick={() => completar(null)}>
              Inscribir sin costo
            </button>
          </div>
        ) : (
          <FormularioPago key={clienteId ?? 'invitado'} total={precio} onCancelar={onListo} onPagar={completar} />
        ))}
    </div>
  )
}
