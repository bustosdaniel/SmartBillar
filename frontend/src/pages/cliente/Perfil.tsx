import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CalendarDays, CreditCard, History, Lock, PiggyBank, Trophy } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { cambiarPassword } from '../../auth/usuarios'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { useAhora } from '../../hooks/useAhora'
import { useSesionesFinalizadas } from '../../mesas/sesiones'
import { estadoMembresia, useMembresias, usePlanes } from '../../membresias/membresias'
import { useTorneos } from '../../torneos/torneos'
import { formatearFecha, formatearHorasMin, formatearPesos } from '../../utils/formato'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

export function Perfil() {
  const { usuario, actualizarPerfil } = useAuth()
  const finalizadas = useSesionesFinalizadas()
  const membresias = useMembresias()
  const planes = usePlanes()
  const torneos = useTorneos()
  const ahora = useAhora()
  const [mensajeDatos, setMensajeDatos] = useState<Mensaje>(null)
  const [mensajeClave, setMensajeClave] = useState<Mensaje>(null)
  const [cambioClaveAbierto, setCambioClaveAbierto] = useState(false)

  if (!usuario) return null

  const partidas = finalizadas.filter((s) => s.clienteId === usuario.id)
  const tiempo = partidas.reduce((t, s) => t + s.tiempoMs, 0)
  const ahorro = partidas.reduce((t, s) => t + ((s.subtotal ?? s.total) - s.total), 0)
  const misTorneos = torneos.filter((t) => t.jugadores.some((j) => j.clienteId === usuario.id))
  const membresia = membresias[usuario.id]
  const membresiaVigente = membresia && estadoMembresia(membresia, ahora) !== 'vencida'

  async function guardarDatos(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    try {
      await actualizarPerfil({
        nombre: String(datos.get('nombre')).trim(),
        email: String(datos.get('email')).trim(),
        telefono: String(datos.get('telefono')).trim(),
      })
      setMensajeDatos({ tipo: 'ok', texto: 'Tus datos se guardaron.' })
    } catch (error) {
      setMensajeDatos({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron guardar tus datos.' })
    }
  }

  async function guardarClave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formulario = e.currentTarget
    const datos = new FormData(formulario)
    const nueva = String(datos.get('nueva'))
    if (nueva !== datos.get('confirmar')) {
      setMensajeClave({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    try {
      await cambiarPassword(String(datos.get('actual')), nueva)
    } catch (error) {
      setMensajeClave({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' })
      return
    }
    formulario.reset()
    setMensajeClave({ tipo: 'ok', texto: 'Tu contraseña se cambió.' })
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
        <form className="tarjeta panel-bloque formulario-claro" onSubmit={guardarDatos}>
          <h2 className="titulo-bloque">Datos personales</h2>
          <label>
            Nombre completo
            <input name="nombre" defaultValue={usuario.nombre} required autoComplete="name" />
          </label>
          <label>
            Correo
            <input name="email" type="email" defaultValue={usuario.email} required autoComplete="email" />
          </label>
          <label>
            Celular
            <input name="telefono" type="tel" defaultValue={usuario.telefono ?? ''} required autoComplete="tel" />
          </label>
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
            setCambioClaveAbierto(true)
          }}
        >
          <Lock size={16} aria-hidden="true" /> Actualizar contraseña
        </button>
        {mensajeClave?.tipo === 'ok' && <p role="status" className="aviso-claro">{mensajeClave.texto}</p>}
      </div>

      <Modal abierto={cambioClaveAbierto} titulo="Actualizar contraseña" onCerrar={() => setCambioClaveAbierto(false)}>
        <form className="formulario-claro" onSubmit={guardarClave}>
          <label>
            Contraseña actual
            <input name="actual" type="password" required autoComplete="current-password" />
          </label>
          <label>
            Nueva contraseña
            <input name="nueva" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <label>
            Confirmar nueva contraseña
            <input name="confirmar" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          {mensajeClave?.tipo === 'error' && <p role="alert" className="alerta-clara">{mensajeClave.texto}</p>}
          <button type="submit" className="boton">Cambiar contraseña</button>
        </form>
      </Modal>
    </section>
  )
}
