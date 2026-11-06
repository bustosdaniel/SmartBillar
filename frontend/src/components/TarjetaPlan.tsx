import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { beneficiosDe } from '../membresias/membresias'
import type { Plan } from '../types'
import { formatearPesos } from '../utils/formato'

type TarjetaPlanProps = {
  plan: Plan
  etiqueta?: string
  destacado?: boolean
  children?: ReactNode
}

export function TarjetaPlan({ plan, etiqueta, destacado = false, children }: TarjetaPlanProps) {
  return (
    <article className={`tarjeta plan plan-${plan.id} ${destacado ? 'plan-destacado' : ''}`}>
      <header className="plan-cabecera">
        <span className={`insignia-plan insignia-${plan.id}`}>{plan.nombre}</span>
        {etiqueta && <span className="texto-suave">{etiqueta}</span>}
      </header>
      <p className="plan-precio">
        <strong>{formatearPesos(plan.precioMensual)}</strong>
        <span>/mes</span>
      </p>
      <ul className="plan-beneficios">
        {beneficiosDe(plan).map((b) => (
          <li key={b}>
            <Check size={16} aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
      {children}
    </article>
  )
}
