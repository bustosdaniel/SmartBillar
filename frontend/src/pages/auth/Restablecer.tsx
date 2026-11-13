import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Lock } from 'lucide-react'
import { pedir } from '../../api/cliente'
import { validarRestablecer } from '../../auth/validaciones'
import { CampoTexto } from '../../components/CampoTexto'
import { useValidacion } from '../../hooks/useValidacion'

// Se llega desde el enlace del correo de recuperación (/restablecer?token=…). El enlace sirve una sola vez.
export function Restablecer() {
  const [parametros] = useSearchParams()
  const token = parametros.get('token') ?? ''
  const { errores, eventos, validarTodo } = useValidacion(validarRestablecer)
  const [listo, setListo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!validarTodo(e.currentTarget)) return
    const nueva = String(new FormData(e.currentTarget).get('nueva'))
    setEnviando(true)
    try {
      const { mensaje } = await pedir<{ mensaje: string }>('/auth/restablecer', { cuerpo: { token, nueva } })
      setListo(mensaje)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
      setEnviando(false)
    }
  }

  if (!token) {
    return (
      <div className="formulario">
        <header>
          <h1>Enlace incompleto</h1>
          <p>Abre el enlace completo que te llegó al correo, o pide uno nuevo.</p>
        </header>
        <div className="formulario-enlaces">
          <Link to="/recuperar">Pedir un enlace nuevo</Link>
        </div>
      </div>
    )
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} {...eventos} noValidate>
      <header>
        <h1>Crea tu contraseña nueva</h1>
        <p>Al guardarla se cerrará tu sesión en los demás dispositivos</p>
      </header>
      {listo ? (
        <p role="status" className="aviso">
          {listo}
        </p>
      ) : (
        <>
          <CampoTexto
            etiqueta="Contraseña nueva"
            icono={Lock}
            name="nueva"
            type="password"
            autoComplete="new-password"
            required
            error={errores.nueva}
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
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </>
      )}
      <div className="formulario-enlaces">
        <Link to="/login">{listo ? 'Iniciar sesión' : 'Volver a iniciar sesión'}</Link>
        {error && <Link to="/recuperar">Pedir un enlace nuevo</Link>}
      </div>
    </form>
  )
}
