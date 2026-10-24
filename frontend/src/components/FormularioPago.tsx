import { useState } from 'react'
import { Banknote, CreditCard, Smartphone, type LucideIcon } from 'lucide-react'
import { NOMBRES_METODO, useCaja } from '../caja/caja'
import type { MetodoPago } from '../types'
import { formatearPesos } from '../utils/formato'
import { AbrirCaja } from './AbrirCaja'

const METODOS: { metodo: MetodoPago; icono: LucideIcon }[] = [
  { metodo: 'efectivo', icono: Banknote },
  { metodo: 'transferencia', icono: Smartphone },
  { metodo: 'tarjeta', icono: CreditCard },
]

const BILLETES = [20000, 50000, 100000]

export type DatosPago = {
  metodo: MetodoPago
  recibido: number | null
  cambio: number | null
}

type FormularioPagoProps = {
  total: number
  nota?: string
  onCancelar: () => void
  onPagar: (datos: DatosPago) => void
}

// Método de pago + cálculo de vueltas en efectivo. Exige la caja abierta.
export function FormularioPago({ total, nota, onCancelar, onPagar }: FormularioPagoProps) {
  const caja = useCaja()
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [recibido, setRecibido] = useState('')

  const montoRecibido = Number(recibido) || 0
  const cambio = montoRecibido - total
  const faltaDinero = metodo === 'efectivo' && montoRecibido < total

  if (!caja) {
    return (
      <div className="caja-cerrada">
        <p>
          <strong>La caja está cerrada.</strong> Ábrela para poder cobrar.
        </p>
        <AbrirCaja />
      </div>
    )
  }

  function pagar() {
    if (faltaDinero) return
    const efectivo = metodo === 'efectivo'
    onPagar({ metodo, recibido: efectivo ? montoRecibido : null, cambio: efectivo ? cambio : null })
  }

  return (
    <>
      <fieldset className="metodos">
        <legend>Método de pago</legend>
        {METODOS.map(({ metodo: m, icono: Icono }) => (
          <button
            key={m}
            type="button"
            className={metodo === m ? 'activo' : ''}
            aria-pressed={metodo === m}
            onClick={() => setMetodo(m)}
          >
            <Icono size={20} aria-hidden="true" />
            {NOMBRES_METODO[m]}
          </button>
        ))}
      </fieldset>

      {metodo === 'efectivo' && (
        <div className="efectivo">
          <label>
            ¿Cuánto entregó el cliente?
            <input
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </label>
          <div className="billetes">
            <button type="button" onClick={() => setRecibido(String(total))}>
              Exacto
            </button>
            {BILLETES.filter((b) => b >= total).map((b) => (
              <button key={b} type="button" onClick={() => setRecibido(String(b))}>
                {formatearPesos(b)}
              </button>
            ))}
          </div>
          {montoRecibido > 0 && (
            <div className={`cambio ${faltaDinero ? 'cambio-falta' : ''}`}>
              <span>{faltaDinero ? 'Falta' : 'Cambio a devolver'}</span>
              <strong>{formatearPesos(Math.abs(cambio))}</strong>
            </div>
          )}
        </div>
      )}

      {nota && <p className="nota">{nota}</p>}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="boton" onClick={pagar} disabled={faltaDinero}>
          Cobrar {formatearPesos(total)}
        </button>
      </div>
    </>
  )
}
