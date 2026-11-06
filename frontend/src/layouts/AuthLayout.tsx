import { Navigate, Outlet, useLocation } from 'react-router'
import fondo from '../assets/images/image-login.png'
import { rutaInicio } from '../auth/rutas'
import { useAuth } from '../auth/useAuth'
import { Logo } from '../components/Logo'
import { NOMBRE_APP } from '../config'

const ANIO = new Date().getFullYear()

export function AuthLayout() {
  const location = useLocation()
  const { usuario } = useAuth()
  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />

  return (
    <div className="auth" style={{ backgroundImage: `url(${fondo})` }}>
      <div className="auth-capa" />
      <div className="auth-contenido">
        <div className="auth-marca">
          <Logo tamano="lg" conLema />
        </div>
        <div className="auth-panel">
          <div key={location.key} className="transicion-ruta">
            <Outlet />
          </div>
        </div>
      </div>
      <footer className="auth-pie">
        {NOMBRE_APP} © {ANIO}. Todos los derechos reservados.
      </footer>
    </div>
  )
}
