import { useState } from 'react'
import { useRecargarUsuarios, useUsuarios } from '../../../auth/usuarios'
import { FormularioPago, type DatosPago } from '../../../components/FormularioPago'
import { useAhora } from '../../../hooks/useAhora'
import {
  asignarMembresia,
  diasRestantes,
  estadoMembresia,
  PLAN_IDS,
  useMembresias,
  usePlanes,
  useSolicitudes,
} from '../../../membresias/membresias'
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
  const membresias = useMembresias()
  const solicitudes = useSolicitudes()
  const ahora = useAhora()
  const usuarios = useUsuarios()
  const carga = useRecargarUsuarios()
  const clientes = usuarios.filter((u) => u.rol === 'cliente')
  // Sin solicitud ni renovación se elige de la lista; hasta elegir no hay cliente.
  const [elegidoId, setElegidoId] = useState<number | null>(null)
  const [planId, setPlanId] = useState<PlanId>(base?.planId ?? 'basica')
  const [resultado, setResultado] = useState<Membresia | null>(null)
  const [error, setError] = useState('')

  const plan = planes[planId]
  // Con solicitud o renovación el cliente es fijo y sale de ahí, no de la lista cargada al iniciar sesión:
  // un cliente registrado después no estaría en ella y el selector mostraría a otro.
  const cliente: { id: number; nombre: string; email?: string } | undefined = base
    ? { id: base.clienteId, nombre: base.clienteNombre, email: usuarios.find((u) => u.id === base.clienteId)?.email }
    : clientes.find((c) => c.id === elegidoId)

  // Membresía actual (vigente o vencida) y solicitud pendiente del cliente: si pidió un plan, se cobra ese.
  const actual = cliente ? membresias[cliente.id] : undefined
  const vigente = actual && estadoMembresia(actual, ahora) !== 'vencida' ? actual : undefined
  const pedida = solicitud ?? (cliente ? solicitudes[cliente.id] : undefined)

  function elegirCliente(id: number) {
    setElegidoId(id)
    setError('')
    // Por defecto, lo más probable: el plan que pidió, o renovar el que tiene, o el básico.
    const membresia = membresias[id]
    setPlanId(
      solicitudes[id]?.planId ??
        (membresia && estadoMembresia(membresia, ahora) !== 'vencida' ? membresia.planId : 'basica'),
    )
  }

  function textoEstado(id: number) {
    const membresia = membresias[id]
    if (!membresia) return 'sin membresía'
    const nombre = planes[membresia.planId].nombre
    if (estadoMembresia(membresia, ahora) === 'vencida') return `${nombre} vencida`
    return `${nombre} hasta el ${formatearFecha(membresia.vence)}`
  }

  // El backend cobra y activa en una sola operación: si el cobro falla, no se activa nada.
  async function pagar(datos: DatosPago) {
    if (!cliente) return
    setError('')
    try {
      setResultado(await asignarMembresia(cliente, planId, { metodo: datos.metodo, recibido: datos.recibido }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar la membresía.')
    }
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
      {base ? (
        <dl className="resumen">
          <div>
            <dt>Cliente</dt>
            <dd>
              {base.clienteNombre}
              {cliente?.email && <span className="texto-suave"> ({cliente.email})</span>}
            </dd>
          </div>
        </dl>
      ) : (
        <label>
          Cliente
          {carga === 'error' && (
            <span role="alert" className="alerta-clara">
              No se pudo cargar la lista completa de clientes. Cierra y vuelve a abrir para reintentar.
            </span>
          )}
          <select
            value={cliente?.id ?? ''}
            onChange={(e) => elegirCliente(Number(e.target.value))}
            disabled={carga === 'cargando' && clientes.length === 0}
            autoFocus
          >
            <option value="" disabled>
              {carga === 'cargando' && clientes.length === 0 ? 'Cargando clientes…' : 'Selecciona un cliente…'}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.email}) · {textoEstado(c.id)}
              </option>
            ))}
          </select>
        </label>
      )}

      {cliente && (
        <dl className="resumen">
          <div>
            <dt>Membresía actual</dt>
            <dd>
              {actual ? (
                <>
                  <span className={`insignia-plan insignia-${actual.planId} insignia-chica`}>{planes[actual.planId].nombre}</span>{' '}
                  {vigente
                    ? `vence el ${formatearFecha(actual.vence)} (${diasRestantes(actual, ahora)} días)`
                    : `vencida el ${formatearFecha(actual.vence)}`}
                </>
              ) : (
                'Ninguna'
              )}
            </dd>
          </div>
        </dl>
      )}

      {/* Con una solicitud se cobra el plan que eligió el cliente: el backend rechaza cualquier otro. */}
      <fieldset className="opciones-plan" disabled={!cliente || pedida !== undefined}>
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
      {pedida && (
        <p className="nota">
          El cliente solicitó el plan <strong>{planes[pedida.planId].nombre}</strong>, así que se cobra ese plan. Si quiere
          otro, debe cambiar su solicitud desde su cuenta o puedes rechazarla.
        </p>
      )}
      {cliente && (
        // Lo que hará el backend al cobrar (services/membresias.py, asignar).
        <p className={`aviso-claro ${vigente && vigente.planId !== planId ? 'aviso-cambio-plan' : ''}`}>
          {!vigente ? (
            <>
              <strong>Nueva membresía:</strong> {plan.nombre} por 30 días desde hoy.
            </>
          ) : vigente.planId === planId ? (
            <>
              <strong>Renovación:</strong> se suman 30 días; queda hasta el{' '}
              {formatearFecha(vigente.vence + 30 * 24 * 60 * 60 * 1000)}.
            </>
          ) : (
            <>
              <strong>Cambio de plan:</strong> pasa de {planes[vigente.planId].nombre} a {plan.nombre} por 30 días desde hoy.
              Los {diasRestantes(vigente, ahora)} días que le quedaban de {planes[vigente.planId].nombre} se pierden.
            </>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}

      {cliente && (
        <FormularioPago
          key={planId}
          total={plan.precioMensual}
          nota="La membresía dura 30 días."
          onCancelar={onListo}
          onPagar={pagar}
        />
      )}
    </div>
  )
}
