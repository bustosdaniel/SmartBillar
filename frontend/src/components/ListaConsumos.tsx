import { Trash2 } from 'lucide-react'
import type { Consumo } from '../types'
import { formatearHora, formatearPesos } from '../utils/formato'

type ListaConsumosProps = {
  consumos: Consumo[] | undefined
  onQuitar?: (id: string) => void
}

// Productos pedidos en una mesa, en el orden en que se pidieron.
export function ListaConsumos({ consumos, onQuitar }: ListaConsumosProps) {
  if (!consumos?.length) return <p className="texto-suave">Sin consumos todavía.</p>

  return (
    <ul className="lista-consumos">
      {consumos.map((c) => (
        <li key={c.id}>
          <span className="consumo-cantidad">{c.cantidad} ×</span>
          <span className="consumo-nombre">
            {c.nombre}
            <span className="texto-suave">
              {formatearPesos(c.precio)} c/u · {formatearHora(c.fecha)}
            </span>
          </span>
          <strong>{formatearPesos(c.precio * c.cantidad)}</strong>
          {onQuitar && (
            <button
              type="button"
              className="boton-icono boton-icono-claro"
              aria-label={`Quitar ${c.nombre}`}
              onClick={() => onQuitar(c.id)}
            >
              <Trash2 size={15} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
