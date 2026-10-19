import { Encabezado } from '../../components/Encabezado'
import { Pendiente } from '../../components/Pendiente'

const pendientes = [
  'Productos pedidos, cantidad y precio',
  'Total de consumos de la sesión actual',
  'Consumos de sesiones anteriores',
]

export function Consumos() {
  return (
    <section className="pagina">
      <Encabezado titulo={"Consumos"} subtitulo="Lo que has pedido en tu mesa" />
      <Pendiente items={pendientes} />
    </section>
  )
}
