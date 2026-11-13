import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CalendarDays, CreditCard, History, Lock, PiggyBank, Trophy } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { cambiarPassword } from '../../auth/usuarios'
import {
  AYUDA_CELULAR,
  filtrarCelular,
  LARGO_MAXIMO_CELULAR,
  leerDatosPersonales,
  validarCambioPassword,
  validarDatosPersonales,
} from '../../auth/validaciones'
import { CampoClaro } from '../../components/CampoClaro'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { useAhora } from '../../hooks/useAhora'
import { useValidacion } from '../../hooks/useValidacion'
import { useSesionesFinalizadas } from '../../mesas/sesiones'
import { estadoMembresia, useMembresias, usePlanes } from '../../membresias/membresias'
import { useTorneos } from '../../torneos/torneos'
import { formatearFecha, formatearHorasMin, formatearPesos } from '../../utils/formato'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

export function Perfil() {
  const { usuario, actualizarPerfil, actualizarToken } = useAuth()
  const finalizadas = useSesionesFinalizadas()
  const membresias = useMembresias()
  const planes = usePlanes()
  const torneos = useTorneos()
  const ahora = useAhora()
  const [mensajeDatos, setMensajeDatos] = useState<Mensaje>(null)
  const [mensajeClave, setMensajeClave] = useState<Mensaje>(null)
  const [cambioClaveAbierto, setCambioClaveAbierto] = useState(false)
  const validacionDatos = useValidacion(validarDatosPersonales)
  const validacionClave = useValidacion(validarCambioPassword)
  const [emailEscrito, setEmailEscrito] = useState<string | null>(null)
  const [errorActual, setErrorActual] = useState('')

  if (!usuario) return null

  const partidas = finalizadas.filter((s) => s.clienteId === usuario.id)
  const tiempo = partidas.reduce((t, s) => t + s.tiempoMs, 0)
  const ahorro = partidas.reduce((t, s) => t + ((s.subtotal ?? s.total) - s.total), 0)
  const misTorneos = torneos.filter((t) => t.jugadores.some((j) => j.clienteId === usuario.id))
  const membresia = membresias[usuario.id]
  const membresiaVigente = membresia && estadoMembresia(membresia, ahora) !== 'vencida'

  // Cambiar el correo (con el que se inicia sesión) exige la contraseña actual.
  const cambiaCorreo = emailEscrito !== null && emailEscrito.trim().toLowerCase() !== usuario.email.toLowerCase()

  async function guardarDatos(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formulario = e.currentTarget
    setMensajeDatos(null)
    setErrorActual('')
    const valido = validacionDatos.validarTodo(formulario)
    const datos = new FormData(formulario)
    const actual = String(datos.get('actual') ?? '')
    if (cambiaCorreo && !actual) {
      setErrorActual('Escribe tu contraseña actual para cambiar el correo.')
      return
    }
    if (!valido) return
    try {
      await actualizarPerfil({ ...leerDatosPersonales(datos), ...(cambiaCorreo ? { actual } : {}) })
      setEmailEscrito(null)
      formulario.reset()
      setMensajeDatos({ tipo: 'ok', texto: 'Tus datos se guardaron.' })
    } catch (error) {
      setMensajeDatos({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron guardar tus datos.' })
    }
  }

  async function guardarClave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formulario = e.currentTarget
    setMensajeClave(null)
    if (!validacionClave.validarTodo(formulario)) return
    const datos = new FormData(formulario)
    try {
      // Los demás dispositivos quedan sin sesión; este sigue con el token nuevo.
      actualizarToken(await cambiarPassword(String(datos.get('actual')), String(datos.get('nueva'))))
    } catch (error) {
      setMensajeClave({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' })
      return
    }
    formulario.reset()
    setMensajeClave({ tipo: 'ok', texto: 'Tu contraseña se cambió. Se cerró la sesión en tus otros dispositivos.' })
    setCambioClaveAbierto(false)
  }

  const resumen = [
    {
      icono: CreditCard,
      titulo: 'Membresía',
      valor: membresia && membresiaVigente ? planes[membresia.planId].nombre : 'Sin plan',
      ruta: '/cliente/membresia',
      clase: membresiaVigente ? `dato-plan-${membresia.planId}` : '',
    },
    { icono: History, titulo: 'Partidas', valor: `${partidas.length} · ${formatearHorasMin(tiempo)}`, ruta: '/cliente/historial' },
    { icono: Trophy, titulo: 'Torneos', valor: String(misTorneos.length), ruta: '/cliente/torneos' },
    { icono: PiggyBank, titulo: 'Has ahorrado', valor: formatearPesos(ahorro), ruta: '/cliente/membresia' },
  ]
  const [resumenMembresia, ...resumenActividad] = resumen

  return (
    <section className="pagina">
      <Encabezado titulo="Mi perfil" subtitulo="Tus datos y tu actividad en el club" />

      <div className="perfil-cabecera tarjeta">
        <span className="avatar avatar-grande" aria-hidden="true">
          {usuario.nombre.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2>{usuario.nombre}</h2>
          <p className="texto-suave">{usuario.email}</p>
          {usuario.creado && (
            <p className="nota nota-icono">
              <CalendarDays size={14} aria-hidden="true" /> Miembro desde el {formatearFecha(usuario.creado)}
            </p>
          )}
        </div>
      </div>

      <div className="perfil-plan">
        {[resumenMembresia].map(({ icono: Icono, titulo, valor, ruta, clase }) => (
          <Link key={titulo} to={ruta} className={`tarjeta dato dato-enlace ${clase ?? ''}`}>
            <span>
              <Icono size={15} aria-hidden="true" /> {titulo}
            </span>
            <strong>{valor}</strong>
          </Link>
        ))}
      </div>

      <div className="perfil-contenido">
        <form className="tarjeta panel-bloque formulario-claro" onSubmit={guardarDatos} {...validacionDatos.eventos} noValidate>
          <h2 className="titulo-bloque">Datos personales</h2>
          <CampoClaro
            etiqueta="Nombre completo"
            name="nombre"
            defaultValue={usuario.nombre}
            required
            autoComplete="name"
            error={validacionDatos.errores.nombre}
          />
          <CampoClaro
            etiqueta="Correo"
            name="email"
            type="email"
            defaultValue={usuario.email}
            required
            autoComplete="email"
            onChange={(e) => setEmailEscrito(e.target.value)}
            error={validacionDatos.errores.email}
          />
          {cambiaCorreo && (
            <CampoClaro
              etiqueta="Contraseña actual"
              name="actual"
              type="password"
              required
              autoComplete="current-password"
              ayuda="Por seguridad, para cambiar el correo con el que inicias sesión."
              error={errorActual || undefined}
            />
          )}
          <CampoClaro
            etiqueta="Celular"
            name="telefono"
            type="tel"
            defaultValue={usuario.telefono ?? ''}
            required
            autoComplete="tel"
            inputMode="tel"
            maxLength={LARGO_MAXIMO_CELULAR}
            onInput={filtrarCelular}
            error={validacionDatos.errores.telefono}
            ayuda={AYUDA_CELULAR}
          />
          {mensajeDatos && (
            <p role={mensajeDatos.tipo === 'error' ? 'alert' : 'status'} className={mensajeDatos.tipo === 'error' ? 'alerta-clara' : 'aviso-claro'}>
              {mensajeDatos.texto}
            </p>
          )}
          <button type="submit" className="boton">
            Guardar cambios
          </button>
        </form>

        <div className="perfil-lateral">
          <div className="perfil-actividad">
            {resumenActividad.map(({ icono: Icono, titulo, valor, ruta }) => (
              <Link key={titulo} to={ruta} className="tarjeta dato dato-enlace">
                <span>
                  <Icono size={15} aria-hidden="true" /> {titulo}
                </span>
                <strong>{valor}</strong>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="tarjeta panel-bloque formulario-claro perfil-seguridad">
        <h2 className="titulo-bloque">Seguridad</h2>
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => {
            setMensajeClave(null)
            validacionClave.reiniciar()
            setCambioClaveAbierto(true)
          }}
        >
          <Lock size={16} aria-hidden="true" /> Actualizar contraseña
        </button>
        {mensajeClave?.tipo === 'ok' && <p role="status" className="aviso-claro">{mensajeClave.texto}</p>}
      </div>

      <Modal abierto={cambioClaveAbierto} titulo="Actualizar contraseña" onCerrar={() => setCambioClaveAbierto(false)}>
        <form className="formulario-claro" onSubmit={guardarClave} {...validacionClave.eventos} noValidate>
          <CampoClaro
            etiqueta="Contraseña actual"
            name="actual"
            type="password"
            required
            autoComplete="current-password"
            error={validacionClave.errores.actual}
          />
          <CampoClaro
            etiqueta="Nueva contraseña"
            name="nueva"
            type="password"
            required
            autoComplete="new-password"
            error={validacionClave.errores.nueva}
            conReglas
          />
          <CampoClaro
            etiqueta="Confirmar nueva contraseña"
            name="confirmar"
            type="password"
            required
            autoComplete="new-password"
            error={validacionClave.errores.confirmar}
          />
          {mensajeClave?.tipo === 'error' && <p role="alert" className="alerta-clara">{mensajeClave.texto}</p>}
          <button type="submit" className="boton">Cambiar contraseña</button>
        </form>
      </Modal>
    </section>
  )
}
