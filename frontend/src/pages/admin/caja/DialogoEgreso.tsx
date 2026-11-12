import { useState, type FormEvent } from 'react'
import { efectivoEsperado, registrarEgreso, useCaja } from '../../../caja/caja'
import { formatearPesos } from '../../../utils/formato'
import { errorNumero, LIMITES } from '../../../utils/montos'

const SUGERENCIAS = ['Compra de tizas', 'Insumos en licoreria', 'Pago de servicios', 'Mantenimiento de mesas']

export function DialogoEgreso({ onListo }: { onListo: () => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [monto, setMonto] = useState('')
  const caja = useCaja()
  const disponible = caja ? efectivoEsperado(caja) : 0

  // El egreso sale en efectivo del cajón: no puede ser más de lo que hay.
  const errorMonto =
    monto.trim() === ''
      ? null
      : (errorNumero(monto, LIMITES.egreso) ??
        (Number(monto) > disponible ? `No hay tanto efectivo en caja: hay ${formatearPesos(Math.max(0, disponible))}.` : null))
  const bloqueado = enviando || monto.trim() === '' || errorMonto !== null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (bloqueado) return
    const datos = new FormData(e.currentTarget)
    setError('')
    setEnviando(true)
    try {
      await registrarEgreso(String(datos.get('concepto')).trim(), Number(monto))
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el egreso.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Concepto
        <input name="concepto" list="sugerencias-egreso" required autoFocus />
        <datalist id="sugerencias-egreso">
          {SUGERENCIAS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Monto
        <input
          name="monto"
          type="number"
          min={LIMITES.egreso.min}
          max={Math.max(LIMITES.egreso.min, Math.min(LIMITES.egreso.max, disponible))}
          step={100}
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          aria-invalid={errorMonto ? true : undefined}
          required
        />
        {errorMonto ? (
          <span role="alert" className="campo-error">
            {errorMonto}
          </span>
        ) : (
          <span className="campo-ayuda">Efectivo disponible en caja: {formatearPesos(Math.max(0, disponible))}.</span>
        )}
      </label>
      <p className="nota">El egreso sale en efectivo del cajón y se descuenta del efectivo esperado.</p>
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
