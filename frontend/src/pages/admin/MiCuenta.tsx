import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { cambiarPassword, NOMBRES_CARGO } from '../../auth/usuarios'
import { validarCambioPassword } from '../../auth/validaciones'
import { CampoClaro } from '../../components/CampoClaro'
import { Encabezado } from '../../components/Encabezado'
import { useValidacion } from '../../hooks/useValidacion'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

// Cuenta del empleado (administrador o cajero): sus datos y el cambio de contraseña. Así nadie se queda
// operando con la contraseña temporal 123456.
export function MiCuenta() {
  const { usuario, actualizarToken } = useAuth()
  const validacion = useValidacion(validarCambioPassword)
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [enviando, setEnviando] = useState(false)

  if (!usuario) return null

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formulario = e.currentTarget
    setMensaje(null)
    if (!validacion.validarTodo(formulario)) return
    const datos = new FormData(formulario)
    setEnviando(true)
    try {
      // Los demás dispositivos quedan sin sesión; este sigue con el token nuevo.
      actualizarToken(await cambiarPassword(String(datos.get('actual')), String(datos.get('nueva'))))
      formulario.reset()
      validacion.reiniciar()
      setMensaje({ tipo: 'ok', texto: 'Tu contraseña se cambió. Se cerró la sesión en tus otros dispositivos.' })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="pagina pagina-angosta">
      <Encabezado titulo="Mi cuenta" subtitulo="Tus datos y tu contraseña" />

      <div className="perfil-cabecera tarjeta">
        <span className="avatar avatar-grande" aria-hidden="true">
          {usuario.nombre.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2>{usuario.nombre}</h2>
          <p className="texto-suave">{usuario.email}</p>
          {usuario.cargo && <span className="estado membresia-activa">{NOMBRES_CARGO[usuario.cargo]}</span>}
        </div>
      </div>

      <form className="tarjeta panel-bloque formulario-claro" onSubmit={guardar} {...validacion.eventos} noValidate>
        <h2 className="titulo-bloque">
          <KeyRound size={18} aria-hidden="true" /> Cambiar contraseña
        </h2>
        <CampoClaro
          etiqueta="Contraseña actual"
          name="actual"
          type="password"
          required
          autoComplete="current-password"
          error={validacion.errores.actual}
        />
        <CampoClaro
          etiqueta="Nueva contraseña"
          name="nueva"
          type="password"
          required
          autoComplete="new-password"
          error={validacion.errores.nueva}
          conReglas
        />
        <CampoClaro
          etiqueta="Confirmar nueva contraseña"
          name="confirmar"
          type="password"
          required
          autoComplete="new-password"
          error={validacion.errores.confirmar}
        />
        {mensaje && (
          <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={mensaje.tipo === 'error' ? 'alerta-clara' : 'aviso-claro'}>
            {mensaje.texto}
          </p>
        )}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </section>
  )
}
