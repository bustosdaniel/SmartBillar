import { useState } from 'react'
import { Printer, Undo2 } from 'lucide-react'
import { useEsAdministrador } from '../../../auth/useAuth'
import { NOMBRES_METODO, puedeAnularse } from '../../../caja/caja'
import { DetalleCuenta } from '../../../components/DetalleCuenta'
import { FormularioPago, type DatosPago } from '../../../components/FormularioPago'
import { ListaConsumos } from '../../../components/ListaConsumos'
import { cuentaDeCobro, useCalculadoraCuenta, type CuentaMesa } from '../../../mesas/cuenta'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { usePlanes } from '../../../membresias/membresias'
import { anularCobroMesa, cobrarMesa, useSesiones } from '../../../mesas/sesiones'
import type { Consumo, Mesa, Pago, Sesion } from '../../../types'
import { formatearDuracion, formatearHora, formatearPesos } from '../../../utils/formato'

type DialogoCobrarProps = {
  mesa: Mesa
  sesion: Sesion
  onListo: () => void
}

export function DialogoCobrar({ mesa, sesion: inicial, onListo }: DialogoCobrarProps) {
  const esAdministrador = useEsAdministrador()
  const planes = usePlanes()
  // La sesión al día (por si se agregó o quitó un consumo); al cobrarla sale de la lista.
  const sesion = useSesiones()[mesa.id] ?? inicial
  const fin = sesion.detenidaEn ?? sesion.inicio
  const calcular = useCalculadoraCuenta()
  // El recibo muestra lo que cobró el backend, no la vista previa.
  const [cobrado, setCobrado] = useState<{ pago: Pago; cuenta: CuentaMesa; consumos: Consumo[] } | null>(null)
  const [confirmarAnular, setConfirmarAnular] = useState(false)
  const [aviso, setAviso] = useState('')

  const cuenta = cobrado?.cuenta ?? calcular(sesion, fin)

  // Solo se envía cómo pagó: el total lo calcula el backend con la misma fórmula de la vista previa.
  async function cobrar(datos: DatosPago) {
    try {
      const cobro = await cobrarMesa(mesa.id, { metodo: datos.metodo, recibido: datos.recibido })
      setAviso('')
      setCobrado({ pago: cobro.pago, cuenta: cuentaDeCobro(cobro.cuenta, planes), consumos: cobro.sesion.consumos })
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo registrar el cobro.')
    }
  }

  // El datáfono o el banco lo rechazó después de cobrar: se vuelve al cobro con la mesa Por cobrar.
  async function anular(pago: Pago) {
    const error = await anularCobroMesa(pago)
    setConfirmarAnular(false)
    if (error) {
      setAviso(error)
      return
    }
    setAviso(`Cobro con ${NOMBRES_METODO[pago.metodo].toLowerCase()} anulado. Cobra de nuevo, con el mismo u otro método.`)
    setCobrado(null)
  }

  if (cobrado) {
    const { pago } = cobrado
    return (
      <div className="formulario-claro">
        <div className="recibo">
          <h3>Recibo de pago</h3>
          <p className="texto-suave">
            {mesa.nombre} · {NOMBRES_MODO[mesa.modo]} · {formatearHora(pago.fecha)}
          </p>
          {cobrado.consumos.length ? <ListaConsumos consumos={cobrado.consumos} /> : null}
          <dl className="resumen">
            <div>
              <dt>Cliente</dt>
              <dd>{pago.cliente}</dd>
            </div>
            <div>
              <dt>Tiempo</dt>
              <dd>{formatearDuracion(cuenta.tiempoMs)}</dd>
            </div>
            <div>
              <dt>Método</dt>
              <dd>{NOMBRES_METODO[pago.metodo]}</dd>
            </div>
            {pago.recibido !== null && (
              <div>
                <dt>Recibido</dt>
                <dd>{formatearPesos(pago.recibido)}</dd>
              </div>
            )}
            {pago.cambio !== null && (
              <div>
                <dt>Cambio</dt>
                <dd>{formatearPesos(pago.cambio)}</dd>
              </div>
            )}
            <DetalleCuenta cuenta={cuenta} textoTotal="Total pagado" />
          </dl>
        </div>
        <p className="aviso-claro">Cobro registrado en caja. La mesa quedó disponible.</p>
        {aviso && (
          <p role="alert" className="alerta-clara">
            {aviso}
          </p>
        )}
        {confirmarAnular ? (
          <div className="confirmar-anular" role="alertdialog" aria-label="Anular cobro">
            <p>
              ¿El {pago.metodo === 'tarjeta' ? 'datáfono' : 'banco'} rechazó el pago? Se anula el cobro de{' '}
              <strong>{formatearPesos(pago.monto)}</strong> y la mesa vuelve a quedar Por cobrar.
            </p>
            <div className="dialogo-acciones">
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmarAnular(false)}>
                No, fue aprobado
              </button>
              <button type="button" className="boton boton-peligro" onClick={() => anular(pago)}>
                Sí, anular cobro
              </button>
            </div>
          </div>
        ) : (
          esAdministrador &&
          puedeAnularse(pago) && (
            <button type="button" className="boton-enlace" onClick={() => setConfirmarAnular(true)}>
              <Undo2 size={15} aria-hidden="true" /> ¿Rechazado? Anular cobro
            </button>
          )
        )}
        <div className="dialogo-acciones">
          <button type="button" className="boton boton-secundario" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Imprimir
          </button>
          <button type="button" className="boton" onClick={onListo}>
            Listo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="formulario-claro">
      {aviso && (
        <p role="status" className="aviso-claro aviso-ambar">
          {aviso}
        </p>
      )}
      {sesion.consumos.length ? <ListaConsumos consumos={sesion.consumos} /> : null}
      <dl className="resumen">
        <div>
          <dt>Cliente</dt>
          <dd>
            {sesion.clienteNombre}
            {cuenta.plan && <span className={`insignia-plan insignia-${cuenta.plan.id} insignia-chica`}>{cuenta.plan.nombre}</span>}
          </dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>
            {formatearHora(sesion.inicio)} – {formatearHora(fin)}
          </dd>
        </div>
        <div>
          <dt>Tiempo jugado</dt>
          <dd>{formatearDuracion(cuenta.tiempoMs)}</dd>
        </div>
        <div>
          <dt>Tarifa</dt>
          <dd>{formatearPesos(cuenta.tarifaHora)}/h</dd>
        </div>
        {sesion.regla && (
          <div>
            <dt>Tarifa especial</dt>
            <dd>{sesion.regla}</dd>
          </div>
        )}
        <DetalleCuenta cuenta={cuenta} textoTotal="Total a cobrar" />
      </dl>

      <FormularioPago
        total={cuenta.total}
        nota="El tiempo quedó detenido al pulsar Finalizar. Si cierras esta ventana, la mesa queda Por cobrar sin sumar minutos."
        onCancelar={onListo}
        onPagar={cobrar}
      />
    </div>
  )
}
