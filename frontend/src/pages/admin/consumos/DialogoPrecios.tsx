import { useState } from 'react'
import { CATEGORIAS, guardarPrecios, NOMBRES_CATEGORIA, obtenerProductos } from '../../../consumos/productos'

export function DialogoPrecios({ onListo }: { onListo: () => void }) {
  const [productos] = useState(obtenerProductos)
  // Se edita una copia y solo se guarda al confirmar. Lo ya pedido conserva su precio.
  const [precios, setPrecios] = useState<Record<string, number>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, p.precio])),
  )

  return (
    <div className="formulario-claro tarifas">
      {CATEGORIAS.map((categoria) => (
        <table key={categoria} className="tabla tabla-tarifas">
          <thead>
            <tr>
              <th>{NOMBRES_CATEGORIA[categoria]}</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {productos
              .filter((p) => p.categoria === categoria)
              .map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      inputMode="numeric"
                      aria-label={`Precio de ${p.nombre}`}
                      value={precios[p.id]}
                      onChange={(e) => setPrecios((x) => ({ ...x, [p.id]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ))}
      <p className="nota">Los productos ya pedidos en una mesa conservan el precio con el que se pidieron.</p>
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton"
          onClick={() => {
            guardarPrecios(precios)
            onListo()
          }}
        >
          Guardar precios
        </button>
      </div>
    </div>
  )
}
