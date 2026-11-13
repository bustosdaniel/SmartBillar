import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Lock, Mail } from 'lucide-react'
import { AVISO_SESION_CERRADA } from '../../auth/AuthContext'
import { rutaInicio } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { validarLogin } from '../../auth/validaciones'
import { CampoTexto } from '../../components/CampoTexto'
import { useValidacion } from '../../hooks/useValidacion'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  // Si se llegó aquí porque el backend cerró la sesión, se explica una vez.
  const [error, setError] = useState(() => {
    if (!sessionStorage.getItem(AVISO_SESION_CERRADA)) return ''
    sessionStorage.removeItem(AVISO_SESION_CERRADA)
    return 'Tu sesión se cerró (venció o cambió la contraseña). Inicia sesión de nuevo.'
  })
  const [enviando, setEnviando] = useState(false)
  const { errores, eventos, validarTodo } = useValidacion(validarLogin)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!validarTodo(e.currentTarget)) return
    const datos = new FormData(e.currentTarget)
    setEnviando(true)
    try {
      const u = await login(String(datos.get('email')).trim(), String(datos.get('password')), datos.get('recordar') === 'on')
      navigate(rutaInicio(u.rol), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} {...eventos} noValidate>
      <header>
        <h1>Iniciar sesión</h1>
        <p>Ingresa tus credenciales para continuar</p>
      </header>
      <CampoTexto
        etiqueta="Correo electrónico"
        icono={Mail}
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errores.email}
      />
      <CampoTexto
        etiqueta="Contraseña"
        icono={Lock}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errores.password}
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
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
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
