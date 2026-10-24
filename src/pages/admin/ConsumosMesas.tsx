import { useState } from 'react'
import { CupSoda, Plus, Tags, User } from 'lucide-react'
import { CATEGORIAS, NOMBRES_CATEGORIA, totalConsumos, useProductos } from '../../consumos/productos'
import { Encabezado } from '../../components/Encabezado'
import { ListaConsumos } from '../../components/ListaConsumos'
import { Modal } from '../../components/Modal'
import { TarjetaProducto } from '../../components/TarjetaProducto'
import { useAhora } from '../../hooks/useAhora'
import { mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { estadoMesa, useSesiones, useSesionesFinalizadas } from '../../mesas/sesiones'
import type { Mesa } from '../../types'
import { esMismoDia, formatearPesos } from '../../utils/formato'
import { DialogoConsumo } from './consumos/DialogoConsumo'
import { DialogoPrecios } from './consumos/DialogoPrecios'

type Dialogo = { tipo: 'consumo'; mesa: Mesa } | { tipo: 'precios' } | null

export function ConsumosMesas() {
  const sesiones = useSesiones()
  const finalizadas = useSesionesFinalizadas()
  const productos = useProductos()
  const ahora = useAhora()
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const enJuego = mesasMock.flatMap((mesa) => {
    const sesion = sesiones[mesa.id]
    return sesion ? [{ mesa, sesion }] : []
  })
  const enCurso = enJuego.reduce((total, { sesion }) => total + totalConsumos(sesion.consumos), 0)
  const deHoy = finalizadas.filter((s) => esMismoDia(s.fin, ahora)).flatMap((s) => s.consumos ?? [])
  const vendidoHoy = totalConsumos(deHoy)
  const unidadesHoy = deHoy.reduce((total, c) => total + c.cantidad, 0)

  const cerrar = () => setDialogo(null)

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Consumos" subtitulo="Productos pedidos por mesa" />
        <button type="button" className="boton boton-secundario" onClick={() => setDialogo({ tipo: 'precios' })}>
          <Tags size={16} aria-hidden="true" /> Precios
        </button>
      </header>

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Mesas en juego</span>
          <strong>{enJuego.length}</strong>
        </div>
        <div className="tarjeta dato dato-ambar">
          <span>Consumos por cobrar</span>
          <strong>{formatearPesos(enCurso)}</strong>
        </div>
        <div className="tarjeta dato dato-verde">
          <span>Vendido hoy</span>
          <strong>{formatearPesos(vendidoHoy)}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Productos vendidos hoy</span>
          <strong>{unidadesHoy}</strong>
        </div>
      </div>

      <h2 className="titulo-bloque">Mesas en juego</h2>
      {enJuego.length === 0 ? (
        <div className="tarjeta sin-mesa">
          <CupSoda size={36} aria-hidden="true" />
          <h2>No hay mesas en juego</h2>
          <p className="texto-suave">Los consumos se registran en la cuenta de una mesa con sesión activa.</p>
        </div>
      ) : (
        <div className="grid-consumos">
          {enJuego.map(({ mesa, sesion }) => (
            <article key={mesa.id} className={`tarjeta mesa mesa-${estadoMesa(sesion)} consumo-mesa`}>
              <header className="mesa-cabecera">
                <div>
                  <h3>{mesa.nombre}</h3>
                  <span className="mesa-modo">{NOMBRES_MODO[mesa.modo]}</span>
                </div>
                <strong>{formatearPesos(totalConsumos(sesion.consumos))}</strong>
              </header>
              <span className="mesa-cliente">
                <User size={15} aria-hidden="true" />
                {sesion.clienteNombre}
              </span>
              <ListaConsumos consumos={sesion.consumos} />
              <button
                type="button"
                className="boton boton-secundario"
                onClick={() => setDialogo({ tipo: 'consumo', mesa })}
              >
                <Plus size={16} aria-hidden="true" /> Agregar consumo
              </button>
            </article>
          ))}
        </div>
      )}

      {CATEGORIAS.map((categoria) => (
        <section key={categoria} className="panel-bloque">
          <h2 className="titulo-bloque">{NOMBRES_CATEGORIA[categoria]}</h2>
          <div className="grid-productos">
            {productos
              .filter((p) => p.categoria === categoria)
              .map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
          </div>
        </section>
      ))}

      <Modal
        abierto={dialogo !== null}
        titulo={dialogo?.tipo === 'consumo' ? `Agregar consumo · ${dialogo.mesa.nombre}` : 'Precios de productos'}
        onCerrar={cerrar}
      >
        {dialogo?.tipo === 'consumo' && <DialogoConsumo mesa={dialogo.mesa} onListo={cerrar} />}
        {dialogo?.tipo === 'precios' && <DialogoPrecios onListo={cerrar} />}
      </Modal>
    </section>
  )
}
