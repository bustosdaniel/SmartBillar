import { createBrowserRouter, Navigate } from 'react-router'
import { RutaProtegida } from './auth/RutaProtegida'
import { AdminLayout } from './layouts/AdminLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { ClienteLayout } from './layouts/ClienteLayout'
import { Caja } from './pages/admin/Caja'
import { ConsumosMesas } from './pages/admin/ConsumosMesas'
import { Membresias } from './pages/admin/Membresias'
import { Mesas } from './pages/admin/Mesas'
import { NotificacionesAdmin } from './pages/admin/NotificacionesAdmin'
import { Panel } from './pages/admin/Panel'
import { Reportes } from './pages/admin/Reportes'
import { TorneoDetalleAdmin } from './pages/admin/TorneoDetalleAdmin'
import { TorneosAdmin } from './pages/admin/TorneosAdmin'
import { Usuarios } from './pages/admin/Usuarios'
import { Login } from './pages/auth/Login'
import { RecuperarPassword } from './pages/auth/RecuperarPassword'
import { Registro } from './pages/auth/Registro'
import { Consumos } from './pages/cliente/Consumos'
import { Historial } from './pages/cliente/Historial'
import { Inicio } from './pages/cliente/Inicio'
import { Membresia } from './pages/cliente/Membresia'
import { MiMesa } from './pages/cliente/MiMesa'
import { Notificaciones } from './pages/cliente/Notificaciones'
import { Perfil } from './pages/cliente/Perfil'
import { TorneoDetalle } from './pages/cliente/TorneoDetalle'
import { Torneos } from './pages/cliente/Torneos'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/registro', element: <Registro /> },
      { path: '/recuperar', element: <RecuperarPassword /> },
    ],
  },
  {
    element: <RutaProtegida rol="cliente" />,
    children: [
      {
        path: '/cliente',
        element: <ClienteLayout />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'mesa', element: <MiMesa /> },
          { path: 'torneos', element: <Torneos /> },
          { path: 'torneos/:id', element: <TorneoDetalle /> },
          { path: 'historial', element: <Historial /> },
          { path: 'consumos', element: <Consumos /> },
          { path: 'membresia', element: <Membresia /> },
          { path: 'notificaciones', element: <Notificaciones /> },
          { path: 'perfil', element: <Perfil /> },
        ],
      },
    ],
  },
  {
    element: <RutaProtegida rol="admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Panel /> },
          { path: 'mesas', element: <Mesas /> },
          { path: 'caja', element: <Caja /> },
          { path: 'consumos', element: <ConsumosMesas /> },
          { path: 'usuarios', element: <Usuarios /> },
          { path: 'membresias', element: <Membresias /> },
          { path: 'torneos', element: <TorneosAdmin /> },
          { path: 'torneos/:id', element: <TorneoDetalleAdmin /> },
          { path: 'reportes', element: <Reportes /> },
          { path: 'notificaciones', element: <NotificacionesAdmin /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
