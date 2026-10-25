import { useState, type FormEvent } from 'react'
import { actualizarPlan } from '../../../membresias/membresias'
import type { Plan } from '../../../types'

export function DialogoEditarPlan({ plan, onListo }: { plan: Plan; onListo: () => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const numero = (campo: string) => Math.max(0, Number(datos.get(campo)) || 0)
    setError('')
    setEnviando(true)
    try {
      await guardar(datos, numero)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el plan.')
      setEnviando(false)
    }
  }

  function guardar(datos: FormData, numero: (campo: string) => number) {
    return actualizarPlan({
      ...plan,
      precioMensual: numero('precioMensual'),
      descuentoMesa: Math.min(100, numero('descuentoMesa')),
      horasGratisMes: numero('horasGratisMes'),
      descuentoBar: Math.min(100, numero('descuentoBar')),
      descuentoTorneo: Math.min(100, numero('descuentoTorneo')),
      extras: String(datos.get('extras'))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    })
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Precio mensual
        <input name="precioMensual" type="number" min={0} step={1000} defaultValue={plan.precioMensual} required />
      </label>
      <div className="campos-fila">
        <label>
          % descuento mesa
          <input name="descuentoMesa" type="number" min={0} max={100} defaultValue={plan.descuentoMesa} />
        </label>
        <label>
          Horas gratis/mes
          <input name="horasGratisMes" type="number" min={0} defaultValue={plan.horasGratisMes} />
        </label>
      </div>
      <div className="campos-fila">
        <label>
          % descuento bar
          <input name="descuentoBar" type="number" min={0} max={100} defaultValue={plan.descuentoBar} />
        </label>
        <label>
          % descuento torneos
          <input name="descuentoTorneo" type="number" min={0} max={100} defaultValue={plan.descuentoTorneo} />
        </label>
      </div>
      <label>
        Otros beneficios (uno por línea)
        <textarea name="extras" rows={5} defaultValue={plan.extras.join('\n')} />
      </label>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
