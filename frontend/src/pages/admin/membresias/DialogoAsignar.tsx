import { useState } from 'react'
import { listarClientes } from '../../../auth/usuarios'
import { registrarPago } from '../../../caja/caja'
import { FormularioPago, type DatosPago } from '../../../components/FormularioPago'
import { asignarMembresia, PLAN_IDS, usePlanes } from '../../../membresias/membresias'
import type { Membresia, PlanId, SolicitudMembresia } from '../../../types'
import { formatearFecha, formatearPesos } from '../../../utils/formato'

type DialogoAsignarProps = {
  // Al renovar llega la membresía actual y el cliente queda fijo.
  renovar?: Membresia
  // Al atender una solicitud del cliente llegan su cliente y el plan que eligió.
  solicitud?: SolicitudMembresia
  onListo: () => void
}

export function DialogoAsignar({ renovar, solicitud, onListo }: DialogoAsignarProps) {
  const base = solicitud ?? renovar
  const planes = usePlanes()
  const [clientes] = useState(listarClientes)
  const [clienteId, setClienteId] = useState(String(base?.clienteId ?? clientes[0]?.id ?? ''))
  const [planId, setPlanId] = useState<PlanId>(base?.planId ?? 'basica')
  const [resultado, setResultado] = useState<Membresia | null>(null)

  const plan = planes[planId]
  const cliente = clientes.find((c) => String(c.id) === clienteId)

  function pagar(datos: DatosPago) {
    if (!cliente) return
    const registrado = registrarPago({
      ...datos,
      concepto: `Membresía ${plan.nombre}`,
      cliente: cliente.nombre,
      monto: plan.precioMensual,
    })
    if (!registrado) return
    setResultado(asignarMembresia(cliente, planId))
  }

  if (resultado) {
    return (
      <div className="formulario-claro">
        <p className="aviso-claro">
          Membresía <strong>{plan.nombre}</strong> activa para {resultado.clienteNombre} hasta el{' '}
          <strong>{formatearFecha(resultado.vence)}</strong>. El pago quedó registrado en caja.
        </p>
        <div className="dialogo-acciones">
          <button type="button" className="boton" onClick={onListo}>
            Listo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="formulario-claro">
      <label>
        Cliente
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} disabled={base !== undefined}>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.email})
            </option>
          ))}
        </select>
      </label>

      <fieldset className="opciones-plan">
        <legend>Plan</legend>
        {PLAN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`opcion-plan opcion-${id} ${planId === id ? 'activo' : ''}`}
            aria-pressed={planId === id}
            onClick={() => setPlanId(id)}
          >
            <strong>{planes[id].nombre}</strong>
            <span>{formatearPesos(planes[id].precioMensual)}</span>
          </button>
        ))}
      </fieldset>

      {cliente && (
        <FormularioPago
          key={planId}
          total={plan.precioMensual}
          nota="La membresía dura 30 días. Si renueva el mismo plan antes de vencer, se suman al vencimiento actual."
          onCancelar={onListo}
          onPagar={pagar}
        />
      )}
    </div>
  )
}
