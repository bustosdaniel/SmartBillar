import { useState, type FormEvent } from 'react'
import { PASSWORD_TEMPORAL, registrarCliente } from '../../../auth/usuarios'
import type { Usuario } from '../../../types'

type DialogoRegistrarClienteProps = {
  onListo: () => void
  // Desde la búsqueda por correo: llega el correo ya escrito y se devuelve el cliente creado.
  emailInicial?: string
  onRegistrado?: (cliente: Usuario) => void
}

export function DialogoRegistrarCliente({ onListo, emailInicial = '', onRegistrado }: DialogoRegistrarClienteProps) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // El backend valida que el correo no esté repetido y asigna la contraseña temporal.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    setError('')
    setEnviando(true)
    try {
      const nuevo = await registrarCliente({
        nombre: String(datos.get('nombre')).trim(),
        email: String(datos.get('email')).trim(),
        telefono: String(datos.get('telefono')).trim(),
      })
      if (onRegistrado) onRegistrado(nuevo)
      else onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar al cliente.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Nombre completo
        <input name="nombre" required autoFocus />
      </label>
      <label>
        Celular
        <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" required />
      </label>
      <label>
        Correo
        <input name="email" defaultValue={emailInicial} type="email" required />
      </label>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <p className="nota">
        La cuenta queda con la contraseña temporal <strong>{PASSWORD_TEMPORAL}</strong>; el cliente la cambia desde Mi
        perfil al iniciar sesión.
      </p>
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar cliente'}
        </button>
      </div>
    </form>
  )
}
