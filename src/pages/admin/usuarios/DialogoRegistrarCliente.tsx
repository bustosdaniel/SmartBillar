import { useState, type FormEvent } from 'react'
import { emailEnUso, guardarRegistrado, PASSWORD_TEMPORAL } from '../../../auth/usuarios'

export function DialogoRegistrarCliente({ onListo }: { onListo: () => void }) {
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const email = String(datos.get('email')).trim()
    if (emailEnUso(email)) {
      setError('Ya existe una cuenta con ese correo.')
      return
    }
    guardarRegistrado({
      nombre: String(datos.get('nombre')).trim(),
      email,
      telefono: String(datos.get('telefono')).trim(),
      cedula: String(datos.get('cedula')).trim(),
      password: PASSWORD_TEMPORAL,
      rol: 'cliente',
    })
    onListo()
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Nombre completo
        <input name="nombre" required autoFocus />
      </label>
      <label>
        Correo
        <input name="email" type="email" required />
      </label>
      <label>
        Celular
        <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" required />
      </label>
      <label>
        Cédula
        <input name="cedula" inputMode="numeric" required />
      </label>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <p className="nota">
        La cuenta queda con la contraseña temporal <strong>{PASSWORD_TEMPORAL}</strong>; el cliente puede cambiarla con
        "¿Olvidaste tu contraseña?".
      </p>
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton">
          Registrar cliente
        </button>
      </div>
    </form>
  )
}
