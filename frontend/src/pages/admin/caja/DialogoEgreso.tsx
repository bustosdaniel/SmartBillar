import { useState, type FormEvent } from 'react'
import { Banknote, CreditCard, Smartphone, type LucideIcon } from 'lucide-react'
import { efectivoEsperado, NOMBRES_METODO, registrarEgreso, useCaja } from '../../../caja/caja'
import type { MetodoPago } from '../../../types'
import { formatearPesos } from '../../../utils/formato'
import { errorNumero, LIMITES } from '../../../utils/montos'
import { CampoNumero } from '../../../components/CampoNumero'

const SUGERENCIAS = ['Compra de tizas', 'Insumos en licoreria', 'Pago de servicios', 'Mantenimiento de mesas']
const METODOS: { metodo: MetodoPago; icono: LucideIcon }[] = [
  { metodo: 'efectivo', icono: Banknote },
  { metodo: 'transferencia', icono: Smartphone },
  { metodo: 'tarjeta', icono: CreditCard },
]

export function DialogoEgreso({ onListo }: { onListo: () => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [conceptoTocado, setConceptoTocado] = useState(false)
  const caja = useCaja()
  const disponible = caja ? efectivoEsperado(caja) : 0
  // Si no hay efectivo en el cajón, lo más probable es que se haya pagado de otra forma.
  const [metodo, setMetodo] = useState<MetodoPago>(() => (disponible < LIMITES.egreso.min ? 'transferencia' : 'efectivo'))
  const enEfectivo = metodo === 'efectivo'

  const errorConcepto = !concepto.trim()
    ? 'Escribe en qué se gastó (ej. Compra de tizas).'
    : concepto.trim().length > 120
      ? 'El concepto no puede tener más de 120 caracteres.'
      : null
  // Solo el efectivo sale del cajón: no puede ser más de lo que hay. Por transferencia o tarjeta, no lo toca.
  const errorMonto =
    monto.trim() === ''
      ? null
      : (errorNumero(monto, LIMITES.egreso) ??
        (enEfectivo && Number(monto) > disponible
          ? `En el cajón solo hay ${formatearPesos(Math.max(0, disponible))} en efectivo. Si se pagó de otra forma, elige transferencia o tarjeta.`
          : null))
  const bloqueado = enviando || monto.trim() === '' || errorMonto !== null || errorConcepto !== null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setConceptoTocado(true)
    if (bloqueado) return
    setError('')
    setEnviando(true)
    try {
      await registrarEgreso(concepto.trim(), Number(monto), metodo)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el egreso.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit} noValidate>
      <label>
        Concepto
        <input
          name="concepto"
          list="sugerencias-egreso"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          onBlur={() => setConceptoTocado(true)}
          maxLength={120}
          aria-invalid={conceptoTocado && errorConcepto ? true : undefined}
          autoFocus
        />
        {conceptoTocado && errorConcepto && (
          <span role="alert" className="campo-error">
            {errorConcepto}
          </span>
        )}
        <datalist id="sugerencias-egreso">
          {SUGERENCIAS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>

      <fieldset className="metodos">
        <legend>¿De dónde salió el dinero?</legend>
        {METODOS.map(({ metodo: m, icono: Icono }) => (
          <button
            key={m}
            type="button"
            className={metodo === m ? 'activo' : ''}
            aria-pressed={metodo === m}
            onClick={() => setMetodo(m)}
          >
            <Icono size={20} aria-hidden="true" />
            {m === 'efectivo' ? 'Efectivo del cajón' : NOMBRES_METODO[m]}
          </button>
        ))}
      </fieldset>

      <label>
        Monto
        <CampoNumero
          name="monto"
          limite={LIMITES.egreso}
          valor={monto}
          onValor={setMonto}
          aria-invalid={errorMonto ? true : undefined}
          required
        />
        {errorMonto ? (
          <span role="alert" className="campo-error">
            {errorMonto}
          </span>
        ) : (
          enEfectivo && (
            <span className="campo-ayuda">Efectivo disponible en el cajón: {formatearPesos(Math.max(0, disponible))}.</span>
          )
        )}
      </label>
      <p className="nota">
        {enEfectivo
          ? 'Sale del cajón y se descuenta del efectivo que debe haber al cerrar.'
          : 'Queda registrado como gasto del turno, pero no toca el efectivo del cajón: el arqueo sigue cuadrando.'}
      </p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton boton-peligro" disabled={bloqueado}>
          Registrar egreso
        </button>
      </div>
    </form>
  )
}
