import { useState, type FormEvent } from 'react'
import { PASSWORD_TEMPORAL, registrarCliente } from '../../../auth/usuarios'
import { AYUDA_CELULAR, filtrarCelular, LARGO_MAXIMO_CELULAR, leerDatosPersonales, validarDatosPersonales } from '../../../auth/validaciones'
import { CampoClaro } from '../../../components/CampoClaro'
import { useValidacion } from '../../../hooks/useValidacion'
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
  const { errores, eventos, validarTodo } = useValidacion(validarDatosPersonales)

  // El backend valida que el correo no esté repetido y asigna la contraseña temporal.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!validarTodo(e.currentTarget)) return
    const datos = new FormData(e.currentTarget)
    setEnviando(true)
    try {
      const nuevo = await registrarCliente(leerDatosPersonales(datos))
      if (onRegistrado) onRegistrado(nuevo)
      else onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar al cliente.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit} {...eventos} noValidate>
      <CampoClaro etiqueta="Nombre completo" name="nombre" required autoFocus error={errores.nombre} />
      <CampoClaro
        etiqueta="Celular"
        name="telefono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={LARGO_MAXIMO_CELULAR}
        onInput={filtrarCelular}
        error={errores.telefono}
        ayuda={AYUDA_CELULAR}
      />
      <CampoClaro etiqueta="Correo" name="email" defaultValue={emailInicial} type="email" required error={errores.email} />
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
