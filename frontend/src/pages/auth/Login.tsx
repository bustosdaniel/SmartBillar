import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Lock, Mail } from 'lucide-react'
import { rutaInicio } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { CampoTexto } from '../../components/CampoTexto'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const u = login(String(datos.get('email')), String(datos.get('password')), datos.get('recordar') === 'on')
    if (!u) {
      setError('Correo o contraseña incorrectos')
      return
    }
    navigate(rutaInicio(u.rol), { replace: true })
  }

  return (
    <form className="formulario" onSubmit={handleSubmit}>
      <header>
        <h1>Iniciar sesión</h1>
        <p>Ingresa tus credenciales para continuar</p>
      </header>
      <CampoTexto etiqueta="Correo electrónico" icono={Mail} name="email" type="email" autoComplete="email" required />
      <CampoTexto
        etiqueta="Contraseña"
        icono={Lock}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <label className="check">
        <input type="checkbox" name="recordar" />
        Recordarme
      </label>
      {error && (
        <p role="alert" className="alerta">
          {error}
        </p>
      )}
      <button type="submit" className="boton">
        Ingresar
      </button>
      <div className="formulario-enlaces">
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        <span>
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </span>
      </div>
    </form>
  )
}
