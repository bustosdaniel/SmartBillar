import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import { CampoTexto } from '../../components/CampoTexto'
import { notificarPorEmail } from '../../notificaciones/notificaciones'

// TODO: el backend debe enviar el correo real con el enlace seguro.
export function RecuperarPassword() {
  const [enviado, setEnviado] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Si el correo no existe no se dice nada, para no revelar qué cuentas están registradas.
    notificarPorEmail(
      String(new FormData(e.currentTarget).get('email')),
      'cuenta',
      'Recupera tu contraseña',
      'Usa el enlace seguro de este correo para crear una nueva contraseña. Vence en 30 minutos.',
    )
    setEnviado(true)
  }

  return (
    <form className="formulario" onSubmit={handleSubmit}>
      <header>
        <h1>Recuperar contraseña</h1>
        <p>Te enviaremos un enlace a tu correo para crear una nueva contraseña</p>
      </header>
      {enviado ? (
        <p role="status" className="aviso">
          Si el correo está registrado, recibirás el enlace en unos minutos.
        </p>
      ) : (
        <>
          <CampoTexto etiqueta="Correo electrónico" icono={Mail} name="email" type="email" autoComplete="email" required />
          <button type="submit" className="boton">
            Enviar enlace
          </button>
        </>
      )}
      <div className="formulario-enlaces">
        <Link to="/login">Volver a iniciar sesión</Link>
      </div>
    </form>
  )
}
