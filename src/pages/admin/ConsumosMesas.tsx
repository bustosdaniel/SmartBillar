import { Encabezado } from '../../components/Encabezado'
import { Pendiente } from '../../components/Pendiente'

const pendientes = [
  'Agregar productos a la cuenta de una mesa',
  'Catálogo de productos y precios',
  'Total de consumos por mesa',
]

export function ConsumosMesas() {
  return (
    <section className="pagina">
      <Encabezado titulo={"Consumos"} subtitulo="Productos pedidos por mesa" />
      <Pendiente items={pendientes} />
    </section>
  )
}
