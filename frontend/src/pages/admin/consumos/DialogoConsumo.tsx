import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { CATEGORIAS, mensajeAgregado, NOMBRES_CATEGORIA, totalConsumos, useProductos } from '../../../consumos/productos'
import { ListaConsumos } from '../../../components/ListaConsumos'
import { TarjetaProducto } from '../../../components/TarjetaProducto'
import { agregarConsumo, quitarConsumo, useSesiones } from '../../../mesas/sesiones'
import type { CategoriaProducto, Mesa } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

const MAXIMO = 50

// Flujo del diagrama: tipo de consumo → menú → cantidad → se registra en la cuenta de la mesa.
export function DialogoConsumo({ mesa, onListo }: { mesa: Mesa; onListo: () => void }) {
  const sesion = useSesiones()[mesa.id]
  const productos = useProductos()
  const [categoria, setCategoria] = useState<CategoriaProducto>('bebida')
  const [elegidoId, setElegidoId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [aviso, setAviso] = useState('')

  if (!sesion) {
    return (
      <div className="formulario-claro">
        <p className="texto-suave">{mesa.nombre} ya no tiene una sesión activa.</p>
        <div className="dialogo-acciones">
          <button type="button" className="boton" onClick={onListo}>
            Listo
          </button>
        </div>
      </div>
    )
  }

  const elegido = productos.find((p) => p.id === elegidoId) ?? null
  const menu = productos.filter((p) => p.categoria === categoria)

  function elegir(id: string) {
    setElegidoId(id)
    setCantidad(1)
    setAviso('')
  }

  function agregar() {
    if (!elegido || !agregarConsumo(mesa.id, elegido, cantidad)) return
    setAviso(`${cantidad} × ${elegido.nombre}: ${mensajeAgregado(elegido).toLowerCase()}.`)
    setElegidoId(null)
    setCantidad(1)
  }

  return (
    <div className="formulario-claro consumo">
      <p className="texto-suave">
        {mesa.nombre} · {sesion.clienteNombre}
      </p>

      <div className="filtros" role="group" aria-label="Tipo de consumo">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            className={categoria === c ? 'activo' : ''}
            aria-pressed={categoria === c}
            onClick={() => {
              setCategoria(c)
              setElegidoId(null)
            }}
          >
            {NOMBRES_CATEGORIA[c]}
          </button>
        ))}
      </div>

      <div className="grid-productos">
        {menu.map((p) => (
          <TarjetaProducto key={p.id} producto={p} activo={p.id === elegidoId} onElegir={() => elegir(p.id)} />
        ))}
      </div>

      {elegido && (
        <div className="pedir-cantidad">
          <span>¿Cuántas unidades de {elegido.nombre}?</span>
          <div className="cantidad">
            <button
              type="button"
              className="boton-icono boton-icono-claro"
              aria-label="Una menos"
              disabled={cantidad <= 1}
              onClick={() => setCantidad((n) => Math.max(1, n - 1))}
            >
              <Minus size={15} />
            </button>
            <input
              type="number"
              min={1}
              max={MAXIMO}
              inputMode="numeric"
              aria-label="Cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(Math.min(MAXIMO, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            />
            <button
              type="button"
              className="boton-icono boton-icono-claro"
              aria-label="Una más"
              disabled={cantidad >= MAXIMO}
              onClick={() => setCantidad((n) => Math.min(MAXIMO, n + 1))}
            >
              <Plus size={15} />
            </button>
          </div>
          <button type="button" className="boton" onClick={agregar}>
            Agregar {formatearPesos(elegido.precio * cantidad)}
          </button>
        </div>
      )}

      {aviso && (
        <p className="aviso-claro" role="status">
          {aviso}
        </p>
      )}

      <h3 className="titulo-bloque">Cuenta de consumos · {formatearPesos(totalConsumos(sesion.consumos))}</h3>
      <ListaConsumos consumos={sesion.consumos} onQuitar={(id) => quitarConsumo(mesa.id, id)} />

      <div className="dialogo-acciones">
        <button type="button" className="boton" onClick={onListo}>
          Listo
        </button>
      </div>
    </div>
  )
}
