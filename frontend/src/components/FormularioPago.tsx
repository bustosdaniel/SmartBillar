import { useRef, useState } from 'react'
import { Banknote, CreditCard, Smartphone, type LucideIcon } from 'lucide-react'
import { NOMBRES_METODO, useCaja } from '../caja/caja'
import { LARGO_MAXIMO_REFERENCIA, LARGO_MINIMO_REFERENCIA, limpiarReferencia } from '../caja/transferencia'
import type { MetodoPago } from '../types'
import { formatearPesos } from '../utils/formato'
import { MONTO_MAXIMO } from '../utils/montos'
import { AbrirCaja } from './AbrirCaja'
import { CampoNumero } from './CampoNumero'
import { DatosTransferencia } from './DatosTransferencia'

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
  // Transferencia: referencia del comprobante, verificada en la app de Nequi/Daviplata.
  referencia: string | null
}

type FormularioPagoProps = {
  total: number
  nota?: string
  onCancelar: () => void
  // Si devuelve una promesa, el botón queda bloqueado hasta que termine.
  onPagar: (datos: DatosPago) => void | Promise<void>
}

// Método de pago + cálculo de vueltas en efectivo. Exige la caja abierta.
export function FormularioPago({ total, nota, onCancelar, onPagar }: FormularioPagoProps) {
  const caja = useCaja()
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [referencia, setReferencia] = useState('')
  const [verificada, setVerificada] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  // Candado síncrono: el estado tarda un render, y dos clics seguidos llegarían antes.
  const enCurso = useRef(false)

  const montoRecibido = Number(recibido) || 0
  const cambio = montoRecibido - total
  const faltaDinero = metodo === 'efectivo' && montoRecibido < total
  // Para no perder plata: la transferencia solo se cobra si se vio llegar en la app y se anotó su referencia.
  const faltaVerificar =
    metodo === 'transferencia' && (referencia.length < LARGO_MINIMO_REFERENCIA || !verificada)
  const bloqueado = faltaDinero || faltaVerificar

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

  async function pagar() {
    if (bloqueado || enCurso.current) return
    enCurso.current = true
    setCobrando(true)
    const efectivo = metodo === 'efectivo'
    try {
      await onPagar({
        metodo,
        recibido: efectivo ? montoRecibido : null,
        cambio: efectivo ? cambio : null,
        referencia: metodo === 'transferencia' ? referencia : null,
      })
    } finally {
      enCurso.current = false
      setCobrando(false)
    }
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
            <CampoNumero
              limite={{ min: 0, max: MONTO_MAXIMO }}
              valor={recibido}
              onValor={setRecibido}
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

      {metodo === 'transferencia' && (
        <div className="verificar-transferencia">
          <DatosTransferencia monto={total} />
          <label>
            Referencia del comprobante
            <input
              value={referencia}
              onChange={(e) => setReferencia(limpiarReferencia(e.target.value))}
              maxLength={LARGO_MAXIMO_REFERENCIA}
              placeholder="Ej: M12345678"
              autoComplete="off"
              autoFocus
            />
            <span className="campo-ayuda">La que aparece en el movimiento de Nequi o Daviplata (no la del cliente: la que llegó).</span>
          </label>
          <label className="check-claro">
            <input type="checkbox" checked={verificada} onChange={(e) => setVerificada(e.target.checked)} />
            Revisé en la app que llegaron {formatearPesos(total)} a la cuenta del club
          </label>
        </div>
      )}

      {nota && <p className="nota">{nota}</p>}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={cobrando}>
          Cancelar
        </button>
        <button type="button" className="boton" onClick={pagar} disabled={bloqueado || cobrando} aria-busy={cobrando}>
          {cobrando ? 'Cobrando…' : `Cobrar ${formatearPesos(total)}`}
        </button>
      </div>
    </>
  )
}
