import { Sparkles } from 'lucide-react'

// Marca una vista que todavía no está construida y lista lo que llevará.
export function Pendiente({ items }: { items: string[] }) {
  return (
    <div className="tarjeta pendiente">
      <div className="pendiente-titulo">
        <Sparkles size={20} aria-hidden="true" />
        <strong>En construcción</strong>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
