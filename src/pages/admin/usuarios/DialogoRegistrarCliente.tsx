import { useState, type FormEvent } from 'react'
import { cedulaEnUso, emailEnUso, guardarRegistrado, PASSWORD_TEMPORAL, sinPassword } from '../../../auth/usuarios'
import type { Usuario } from '../../../types'

type DialogoRegistrarClienteProps = {
  onListo: () => void
  // Desde la búsqueda por cédula: llega la cédula ya escrita y se devuelve el cliente creado.
  cedulaInicial?: string
  onRegistrado?: (cliente: Usuario) => void
}

export function DialogoRegistrarCliente({ onListo, cedulaInicial = '', onRegistrado }: DialogoRegistrarClienteProps) {
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const email = String(datos.get('email')).trim()
    const cedula = String(datos.get('cedula')).trim()
    if (emailEnUso(email)) {
      setError('Ya existe una cuenta con ese correo.')
      return
    }
    if (cedulaEnUso(cedula)) {
      setError('Ya existe una cuenta con esa cédula.')
      return
    }
    const nuevo = guardarRegistrado({
      nombre: String(datos.get('nombre')).trim(),
      email,
      telefono: String(datos.get('telefono')).trim(),
      cedula,
      password: PASSWORD_TEMPORAL,
      rol: 'cliente',
    })
    if (onRegistrado) onRegistrado(sinPassword(nuevo))
    else onListo()
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Nombre completo
        <input name="nombre" required autoFocus />
      </label>
      <label>
        Cédula
        <input name="cedula" inputMode="numeric" defaultValue={cedulaInicial} required />
      </label>
      <label>
        Celular
        <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" required />
      </label>
      <label>
        Correo
        <input name="email" type="email" required />
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
