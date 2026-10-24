import { Link } from 'react-router'
import { Banknote, Bell, CircleDot, Trophy, Users, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { useCaja, useCajasCerradas } from '../../caja/caja'
import { useAhora } from '../../hooks/useAhora'
import { mesasMock } from '../../mesas/datos'
import { useSesiones, useSesionesFinalizadas } from '../../mesas/sesiones'
import { useNotificaciones } from '../../notificaciones/notificaciones'
import { useTorneos } from '../../torneos/torneos'
import { esMismoDia, formatearFecha, formatearHora, formatearPesos } from '../../utils/formato'
import { EstadoMesas } from './panel/EstadoMesas'
import { ProximosTorneos } from './panel/ProximosTorneos'
import { ResumenCaja } from './panel/ResumenCaja'
import { UltimasNotificaciones } from './panel/UltimasNotificaciones'
import { UltimosMovimientos } from './panel/UltimosMovimientos'

type Dato = { titulo: string; valor: string; icono: LucideIcon; color: string }

export function Panel() {
  const { usuario } = useAuth()
  const sinLeer = useNotificaciones().filter((n) => n.usuarioId === usuario?.id && !n.leida).length
  const ahora = useAhora()
  const sesiones = useSesiones()
  const finalizadas = useSesionesFinalizadas()
  const caja = useCaja()
  const cajasCerradas = useCajasCerradas()

  const activas = Object.values(sesiones).filter((s) => s !== undefined)
  const deHoy = finalizadas.filter((s) => esMismoDia(s.fin, ahora))
  const clientesHoy = new Set([...activas, ...deHoy].map((s) => s.clienteNombre)).size
  // Todo lo cobrado hoy en caja: mesas, membresías y demás.
  const ingresosHoy = [...cajasCerradas.flatMap((c) => c.pagos), ...(caja?.pagos ?? [])]
    .filter((p) => esMismoDia(p.fecha, ahora))
    .reduce((total, p) => total + p.monto, 0)
  const torneosActivos = useTorneos().filter((t) => t.estado === 'en-curso').length

  const datos: Dato[] = [
    { titulo: 'Mesas en uso', valor: `${activas.length} / ${mesasMock.length}`, icono: CircleDot, color: 'verde' },
    { titulo: 'Clientes hoy', valor: String(clientesHoy), icono: Users, color: 'azul' },
    { titulo: 'Ingresos hoy', valor: formatearPesos(ingresosHoy), icono: Banknote, color: 'naranja' },
    { titulo: 'Torneos activos', valor: String(torneosActivos), icono: Trophy, color: 'morado' },
  ]

  return (
    <section className="pagina pagina-panel">
      <header className="panel-cabecera">
        <div className="encabezado">
          <h1>Bienvenido, {usuario?.nombre.split(' ')[0]}</h1>
          <p>Aquí tienes un resumen de la actividad del club.</p>
        </div>
        <div className="panel-cabecera-extra">
          <Link
            to="/admin/notificaciones"
            className="boton-icono boton-icono-claro campana"
            aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
          >
            <Bell size={18} />
            {sinLeer > 0 && <span className="campana-insignia">{sinLeer > 9 ? '9+' : sinLeer}</span>}
          </Link>
          <div className="panel-fecha">
            <span>{formatearFecha(ahora)}</span>
            <span>{formatearHora(ahora)}</span>
          </div>
        </div>
      </header>

      <div className="grid-datos">
        {datos.map(({ titulo, valor, icono: Icono, color }) => (
          <div key={titulo} className={`dato-color dato-color-${color}`}>
            <Icono size={30} aria-hidden="true" />
            <div>
              <span>{titulo}</span>
              <strong>{valor}</strong>
            </div>
          </div>
        ))}
      </div>

      <EstadoMesas ahora={ahora} />
      <div className="panel-grid">
        <ResumenCaja ahora={ahora} />
        <UltimosMovimientos />
      </div>
      <div className="panel-grid panel-grid-extra">
        <ProximosTorneos />
        <UltimasNotificaciones />
      </div>
    </section>
  )
}
