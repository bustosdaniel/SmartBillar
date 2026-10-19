import type { FormEvent } from 'react'
import { registrarEgreso } from '../../../caja/caja'

const SUGERENCIAS = ['Compra de tizas', 'Insumos en licoreria', 'Pago de servicios', 'Mantenimiento de mesas']

export function DialogoEgreso({ onListo }: { onListo: () => void }) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    registrarEgreso(String(datos.get('concepto')).trim(), Number(datos.get('monto')) || 0)
    onListo()
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
        <input name="monto" type="number" min={100} step={100} required />
      </label>
      <p className="nota">El egreso sale en efectivo del cajón y se descuenta del efectivo esperado.</p>
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton boton-peligro">
          Registrar egreso
        </button>
      </div>
    </form>
  )
}
