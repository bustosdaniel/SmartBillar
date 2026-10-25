import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Lock, Mail, Phone, User } from 'lucide-react'
import { rutaInicio } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { CampoTexto } from '../../components/CampoTexto'

export function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const password = String(datos.get('password'))
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== datos.get('confirmar')) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setEnviando(true)
    try {
      const usuario = await registrar({
        nombre: String(datos.get('nombre')).trim(),
        email: String(datos.get('email')).trim(),
        telefono: String(datos.get('telefono')).trim(),
        password,
      })
      navigate(rutaInicio(usuario.rol), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit}>
      <header>
        <h1>Crear cuenta</h1>
        <p>Regístrate para reservar mesas e inscribirte en torneos</p>
      </header>
      <CampoTexto etiqueta="Nombre completo" icono={User} name="nombre" autoComplete="name" required />
      <CampoTexto etiqueta="Correo electrónico" icono={Mail} name="email" type="email" autoComplete="email" required />
      <CampoTexto etiqueta="Celular" icono={Phone} name="telefono" type="tel" autoComplete="tel" required />
      <CampoTexto
        etiqueta="Contraseña"
        icono={Lock}
        name="password"
        type="password"
        autoComplete="new-password"
        required
      />
      <CampoTexto
        etiqueta="Confirmar contraseña"
        icono={Lock}
        name="confirmar"
        type="password"
        autoComplete="new-password"
        required
      />
      {error && (
        <p role="alert" className="alerta">
          {error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      <div className="formulario-enlaces">
        <span>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </span>
      </div>
    </form>
  )
}
