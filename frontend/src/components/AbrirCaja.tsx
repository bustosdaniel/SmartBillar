import { useState, type FormEvent } from 'react'
import { abrirCaja } from '../caja/caja'
import { errorNumero, LIMITES } from '../utils/montos'

export function AbrirCaja() {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [base, setBase] = useState('100000')
  const errorBase = errorNumero(base, LIMITES.baseCaja)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (errorBase) return
    setError('')
    setEnviando(true)
    try {
      await abrirCaja(Number(base))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="abrir-caja" onSubmit={handleSubmit}>
      <label>
        Base inicial (efectivo en el cajón)
        <input
          name="base"
          type="number"
          inputMode="numeric"
          min={LIMITES.baseCaja.min}
          max={LIMITES.baseCaja.max}
          step={1000}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          aria-invalid={errorBase ? true : undefined}
          required
        />
        {errorBase && (
          <span role="alert" className="campo-error">
            {errorBase}
          </span>
        )}
      </label>
      <button type="submit" className="boton" disabled={enviando || errorBase !== null}>
        {enviando ? 'Abriendo…' : 'Abrir caja'}
      </button>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
    </form>
  )
}
