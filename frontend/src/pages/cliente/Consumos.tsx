import { CupSoda } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { CATEGORIAS, NOMBRES_CATEGORIA, totalConsumos, useProductos } from '../../consumos/productos'
import { DetalleCuenta } from '../../components/DetalleCuenta'
import { Encabezado } from '../../components/Encabezado'
import { ListaConsumos } from '../../components/ListaConsumos'
import { TarjetaProducto } from '../../components/TarjetaProducto'
import { useAhora } from '../../hooks/useAhora'
import { useCalculadoraCuenta } from '../../mesas/cuenta'
import { mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { sesionDelCliente, useSesiones, useSesionesFinalizadas } from '../../mesas/sesiones'
import { formatearFecha, formatearHora, formatearPesos } from '../../utils/formato'

export function Consumos() {
  const { usuario } = useAuth()
  const sesiones = useSesiones()
  const finalizadas = useSesionesFinalizadas()
  const productos = useProductos()
  const ahora = useAhora()
  const calcular = useCalculadoraCuenta()

  const sesion = sesionDelCliente(sesiones, usuario?.id)
  const mesa = sesion && mesasMock.find((m) => m.id === sesion.mesaId)
  const cuenta = sesion && mesa ? calcular(sesion, mesa, ahora) : null
  const anteriores = finalizadas
    .filter((s) => s.clienteId === usuario?.id && s.consumos?.length)
    .toSorted((a, b) => b.fin - a.fin)

  return (
    <section className="pagina">
      <Encabezado titulo="Consumos" subtitulo="Lo que has pedido en tu mesa" />

      {sesion && mesa && cuenta ? (
        <div className="tarjeta panel-bloque">
          <header className="panel-bloque-cabecera">
            <h2>
              {mesa.nombre} · {NOMBRES_MODO[mesa.modo]}
            </h2>
            <span className="texto-suave">Desde {formatearHora(sesion.inicio)}</span>
          </header>
          <ListaConsumos consumos={sesion.consumos} />
          <dl className="resumen">
            <DetalleCuenta cuenta={cuenta} textoTotal="Total de tu mesa" />
          </dl>
        </div>
      ) : (
        <div className="tarjeta sin-mesa">
          <CupSoda size={36} aria-hidden="true" />
          <h2>No tienes una mesa activa</h2>
          <p className="texto-suave">Cuando estés jugando, aquí verás lo que pidas y cuánto suma a tu cuenta.</p>
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
      <p className="nota">Pide en la caja: el personal lo agrega a la cuenta de tu mesa y lo pagas al finalizar.</p>

      {anteriores.length > 0 && (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Consumos anteriores</h2>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mesa</th>
                  <th>Productos</th>
                  <th className="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                {anteriores.map((s) => (
                  <tr key={`${s.mesaId}-${s.inicio}`}>
                    <td>{formatearFecha(s.fin)}</td>
                    <td>{mesasMock.find((m) => m.id === s.mesaId)?.nombre}</td>
                    <td className="celda-asunto">{s.consumos?.map((c) => `${c.cantidad} × ${c.nombre}`).join(', ')}</td>
                    <td className="numero">{formatearPesos(totalConsumos(s.consumos))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
