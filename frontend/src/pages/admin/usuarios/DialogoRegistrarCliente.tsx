import { useState, type FormEvent } from 'react'
import { PASSWORD_TEMPORAL, registrarCliente } from '../../../auth/usuarios'
import type { Usuario } from '../../../types'

type DialogoRegistrarClienteProps = {
  onListo: () => void
  // Desde la búsqueda por cédula: llega la cédula ya escrita y se devuelve el cliente creado.
  cedulaInicial?: string
  onRegistrado?: (cliente: Usuario) => void
}

export function DialogoRegistrarCliente({ onListo, cedulaInicial = '', onRegistrado }: DialogoRegistrarClienteProps) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // El backend valida correo y cédula repetidos, y asigna la contraseña temporal.
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
        cedula: String(datos.get('cedula')).trim(),
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
