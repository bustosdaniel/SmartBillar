import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Lock, Mail, Phone, User } from 'lucide-react'
import { rutaInicio } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { AYUDA_CELULAR, filtrarCelular, LARGO_MAXIMO_CELULAR, leerDatosPersonales, validarRegistro } from '../../auth/validaciones'
import { CampoTexto } from '../../components/CampoTexto'
import { useValidacion } from '../../hooks/useValidacion'

export function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { errores, eventos, validarTodo } = useValidacion(validarRegistro)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!validarTodo(e.currentTarget)) return
    const datos = new FormData(e.currentTarget)
    setEnviando(true)
    try {
      const usuario = await registrar({ ...leerDatosPersonales(datos), password: String(datos.get('password')) })
      navigate(rutaInicio(usuario.rol), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} {...eventos} noValidate>
      <header>
        <h1>Crear cuenta</h1>
        <p>Regístrate para reservar mesas e inscribirte en torneos</p>
      </header>
      <CampoTexto etiqueta="Nombre completo" icono={User} name="nombre" autoComplete="name" required error={errores.nombre} />
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
        etiqueta="Celular"
        icono={Phone}
        name="telefono"
        type="tel"
        autoComplete="tel"
        required
        inputMode="tel"
        maxLength={LARGO_MAXIMO_CELULAR}
        onInput={filtrarCelular}
        error={errores.telefono}
        ayuda={AYUDA_CELULAR}
      />
      <CampoTexto
        etiqueta="Contraseña"
        icono={Lock}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errores.password}
        conReglas
      />
      <CampoTexto
        etiqueta="Confirmar contraseña"
        icono={Lock}
        name="confirmar"
        type="password"
        autoComplete="new-password"
        required
        error={errores.confirmar}
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
