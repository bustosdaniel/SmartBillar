import { imagenProducto } from '../consumos/productos'
import type { Producto } from '../types'
import { formatearPesos } from '../utils/formato'

type TarjetaProductoProps = {
  producto: Producto
  activo?: boolean
  onElegir?: () => void
}

// Sin foto guardada, el espacio de la imagen queda en blanco.
export function TarjetaProducto({ producto, activo = false, onElegir }: TarjetaProductoProps) {
  const imagen = imagenProducto(producto.id)
  const contenido = (
    <>
      <span className="producto-foto">{imagen && <img src={imagen} alt="" />}</span>
      <span className="producto-nombre">{producto.nombre}</span>
      <strong className="producto-precio">{formatearPesos(producto.precio)}</strong>
    </>
  )

  if (!onElegir) return <div className="producto">{contenido}</div>

  return (
    <button
      type="button"
      className={`producto ${activo ? 'activo' : ''}`}
      aria-pressed={activo}
      onClick={onElegir}
    >
      {contenido}
    </button>
  )
}
