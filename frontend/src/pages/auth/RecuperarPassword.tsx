import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import { pedir } from '../../api/cliente'
import { validarEmailRecuperar } from '../../auth/validaciones'
import { CampoTexto } from '../../components/CampoTexto'

// El backend envía un enlace de un solo uso (vence en 30 minutos) al correo, si tiene cuenta. La respuesta es
// la misma exista o no, para no revelar qué correos están registrados.
export function RecuperarPassword() {
  const [enviado, setEnviado] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    const invalido = validarEmailRecuperar(email)
    if (invalido) {
      setError(invalido)
      return
    }
    setError('')
    setEnviando(true)
    try {
      const { mensaje } = await pedir<{ mensaje: string }>('/auth/recuperar', { cuerpo: { email } })
      setEnviado(mensaje)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <header>
        <h1>Recuperar contraseña</h1>
        <p>Te enviaremos un enlace a tu correo para crear una nueva contraseña</p>
      </header>
      {enviado ? (
        <>
          <p role="status" className="aviso">
            {enviado}
          </p>
          <p className="formulario-nota">
            El enlace vence en 30 minutos. ¿No llegó? También puedes pedir en caja una contraseña temporal.
          </p>
        </>
      ) : (
        <>
          <CampoTexto
            etiqueta="Correo electrónico"
            icono={Mail}
            name="email"
            type="email"
            autoComplete="email"
            required
            error={error || undefined}
          />
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </>
      )}
      <div className="formulario-enlaces">
        <Link to="/login">Volver a iniciar sesión</Link>
      </div>
    </form>
  )
}
