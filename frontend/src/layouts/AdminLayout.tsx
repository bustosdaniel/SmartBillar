import {
  Bell,
  ChartColumn,
  CircleDot,
  CreditCard,
  House,
  ShoppingBag,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useNotificaciones } from '../notificaciones/notificaciones'
import { AppLayout, type ItemMenu } from './AppLayout'

const items: ItemMenu[] = [
  { ruta: '/admin', texto: 'Inicio', icono: House, exacta: true },
  { ruta: '/admin/mesas', texto: 'Mesas', icono: CircleDot },
  { ruta: '/admin/caja', texto: 'Caja', icono: Wallet },
  { ruta: '/admin/consumos', texto: 'Consumos', icono: ShoppingBag },
  { ruta: '/admin/usuarios', texto: 'Usuarios', icono: Users },
  { ruta: '/admin/membresias', texto: 'Membresías', icono: CreditCard },
  { ruta: '/admin/torneos', texto: 'Torneos', icono: Trophy },
  { ruta: '/admin/reportes', texto: 'Reportes', icono: ChartColumn },
  { ruta: '/admin/notificaciones', texto: 'Notificaciones', icono: Bell },
]

export function AdminLayout() {
  const { usuario } = useAuth()
  const sinLeer = useNotificaciones().filter((n) => n.usuarioId === usuario?.id && !n.leida).length
  return <AppLayout items={items.map((i) => (i.ruta === '/admin/notificaciones' ? { ...i, insignia: sinLeer } : i))} />
}
