import { useState } from 'react'
import { CATEGORIAS, guardarPrecios, NOMBRES_CATEGORIA, obtenerProductos } from '../../../consumos/productos'
import { errorNumero, leerNumero, LIMITES_PRODUCTO, mostrarNumero } from '../../../utils/montos'

export function DialogoPrecios({ onListo }: { onListo: () => void }) {
  const [productos] = useState(obtenerProductos)
  // Se edita una copia y solo se guarda al confirmar. Lo ya pedido conserva su precio.
  const [precios, setPrecios] = useState<Record<string, number>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, p.precio])),
  )

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const errores = Object.fromEntries(productos.map((p) => [p.id, errorNumero(precios[p.id], LIMITES_PRODUCTO[p.categoria])]))
  const hayErrores = Object.values(errores).some(Boolean)

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
                      min={LIMITES_PRODUCTO[p.categoria].min}
                      max={LIMITES_PRODUCTO[p.categoria].max}
                      step={100}
                      aria-invalid={errores[p.id] ? true : undefined}
                      inputMode="numeric"
                      aria-label={`Precio de ${p.nombre}`}
                      value={mostrarNumero(precios[p.id])}
                      onChange={(e) => setPrecios((x) => ({ ...x, [p.id]: leerNumero(e.target.value) }))}
                    />
                    {errores[p.id] && (
                      <span role="alert" className="campo-error">
                        {errores[p.id]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ))}
      <p className="nota">Los productos ya pedidos en una mesa conservan el precio con el que se pidieron.</p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton"
          disabled={hayErrores || guardando}
          title={hayErrores ? 'Corrige los precios marcados para guardar.' : undefined}
          onClick={async () => {
            if (hayErrores || guardando) return
            setGuardando(true)
            setError('')
            try {
              await guardarPrecios(precios)
              onListo()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudieron guardar los precios.')
              setGuardando(false)
            }
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar precios'}
        </button>
      </div>
    </div>
  )
}
