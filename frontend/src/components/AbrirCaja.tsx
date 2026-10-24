import type { FormEvent } from 'react'
import { abrirCaja } from '../caja/caja'

export function AbrirCaja() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    abrirCaja(Number(new FormData(e.currentTarget).get('base')) || 0)
  }

  return (
    <form className="abrir-caja" onSubmit={handleSubmit}>
      <label>
        Base inicial (efectivo en el cajón)
        <input name="base" type="number" min={0} step={1000} defaultValue={100000} required />
      </label>
      <button type="submit" className="boton">
        Abrir caja
      </button>
    </form>
  )
}
