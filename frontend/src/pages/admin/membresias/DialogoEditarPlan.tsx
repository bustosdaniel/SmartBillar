import { useState, type FormEvent } from 'react'
import { actualizarPlan } from '../../../membresias/membresias'
import type { Plan } from '../../../types'
import { errorNumero, LIMITES, type Limite } from '../../../utils/montos'
import { CampoNumero } from '../../../components/CampoNumero'

const CAMPOS = {
  precioMensual: LIMITES.precioPlan,
  descuentoMesa: LIMITES.porcentaje,
  horasGratisMes: LIMITES.horasGratis,
  descuentoBar: LIMITES.porcentaje,
  descuentoTorneo: LIMITES.porcentaje,
} satisfies Record<string, Limite>

type Campo = keyof typeof CAMPOS

export function DialogoEditarPlan({ plan, onListo }: { plan: Plan; onListo: () => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [valores, setValores] = useState<Record<Campo, string>>(() => ({
    precioMensual: String(plan.precioMensual),
    descuentoMesa: String(plan.descuentoMesa),
    horasGratisMes: String(plan.horasGratisMes),
    descuentoBar: String(plan.descuentoBar),
    descuentoTorneo: String(plan.descuentoTorneo),
  }))
  const errores = Object.fromEntries(
    (Object.keys(CAMPOS) as Campo[]).map((c) => [c, errorNumero(valores[c], CAMPOS[c])]),
  ) as Record<Campo, string | null>
  const hayErrores = Object.values(errores).some(Boolean)

  // Props de cada input numérico: valor controlado, rango y su error debajo.
  function numerico(campo: Campo) {
    return {
      name: campo,
      limite: CAMPOS[campo],
      valor: valores[campo],
      onValor: (texto: string) => setValores((v) => ({ ...v, [campo]: texto })),
      'aria-invalid': errores[campo] ? true : undefined,
    }
  }

  function errorDe(campo: Campo) {
    return (
      errores[campo] && (
        <span role="alert" className="campo-error">
          {errores[campo]}
        </span>
      )
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (hayErrores) return
    const datos = new FormData(e.currentTarget)
    const numero = (campo: string) => Number(valores[campo as Campo])
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
      descuentoMesa: numero('descuentoMesa'),
      horasGratisMes: numero('horasGratisMes'),
      descuentoBar: numero('descuentoBar'),
      descuentoTorneo: numero('descuentoTorneo'),
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
        <CampoNumero {...numerico('precioMensual')} required />
        {errorDe('precioMensual')}
      </label>
      <div className="campos-fila">
        <label>
          % descuento mesa
          <CampoNumero {...numerico('descuentoMesa')} />
          {errorDe('descuentoMesa')}
        </label>
        <label>
          Horas gratis/mes
          <CampoNumero {...numerico('horasGratisMes')} />
          {errorDe('horasGratisMes')}
        </label>
      </div>
      <div className="campos-fila">
        <label>
          % descuento bar
          <CampoNumero {...numerico('descuentoBar')} />
          {errorDe('descuentoBar')}
        </label>
        <label>
          % descuento torneos
          <CampoNumero {...numerico('descuentoTorneo')} />
          {errorDe('descuentoTorneo')}
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
        <button type="submit" className="boton" disabled={enviando || hayErrores}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
