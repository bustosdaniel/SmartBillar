import { Bell, CreditCard, History, House, ShoppingBag, Timer, Trophy, User } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useNotificaciones } from '../notificaciones/notificaciones'
import { AppLayout, type ItemMenu } from './AppLayout'

const items: ItemMenu[] = [
  { ruta: '/cliente', texto: 'Inicio', icono: House, exacta: true },
  { ruta: '/cliente/mesa', texto: 'Mi mesa', icono: Timer },
  { ruta: '/cliente/torneos', texto: 'Torneos', icono: Trophy },
  { ruta: '/cliente/historial', texto: 'Historial', icono: History },
  { ruta: '/cliente/consumos', texto: 'Consumos', icono: ShoppingBag },
  { ruta: '/cliente/membresia', texto: 'Mi membresía', icono: CreditCard },
  { ruta: '/cliente/notificaciones', texto: 'Notificaciones', icono: Bell },
  { ruta: '/cliente/perfil', texto: 'Perfil', icono: User },
]

export function ClienteLayout() {
  const { usuario } = useAuth()
  const sinLeer = useNotificaciones().filter((n) => n.usuarioId === usuario?.id && !n.leida).length
  return <AppLayout items={items.map((i) => (i.ruta === '/cliente/notificaciones' ? { ...i, insignia: sinLeer } : i))} />
}
