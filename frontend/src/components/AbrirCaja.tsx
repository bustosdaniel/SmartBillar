import { useState, type FormEvent } from 'react'
import { abrirCaja } from '../caja/caja'

export function AbrirCaja() {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const base = Number(new FormData(e.currentTarget).get('base')) || 0
    setError('')
    setEnviando(true)
    try {
      await abrirCaja(base)
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
        <input name="base" type="number" min={0} step={1000} defaultValue={100000} required />
      </label>
      <button type="submit" className="boton" disabled={enviando}>
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
