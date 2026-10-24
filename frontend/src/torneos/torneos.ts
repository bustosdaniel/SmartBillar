import { registrarMovimiento } from '../actividad/movimientos'
import { NOMBRES_MODO } from '../mesas/datos'
import { notificar, notificarAdministradores, notificarClientes } from '../notificaciones/notificaciones'
import { formatearPesos } from '../utils/formato'
import type { CategoriaTorneo, EstadoTorneo, Jugador, Plan, Torneo } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'
import { campeon, definirGanador, generarLlaves, nombreRonda, totalRondas } from './llaves'

export const NOMBRES_CATEGORIA: Record<CategoriaTorneo, string> = {
  abierta: 'Abierta',
  principiante: 'Principiante',
  avanzado: 'Avanzado',
}

export const TEXTO_ESTADO_TORNEO: Record<EstadoTorneo, string> = {
  inscripciones: 'Inscripciones abiertas',
  'en-curso': 'En curso',
  finalizado: 'Finalizado',
}

const DIA = 24 * 60 * 60 * 1000

const rutaCliente = (torneoId: number) => `/cliente/torneos/${torneoId}`
const rutaAdmin = (torneoId: number) => `/admin/torneos/${torneoId}`
const fechaCorta = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

export function formatearFechaTorneo(torneo: Torneo) {
  const [a, m, d] = torneo.fecha.split('-').map(Number)
  return `${fechaCorta.format(new Date(a, m - 1, d))} · ${torneo.hora}`
}

function fechaISO(timestamp: number) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function jugador(id: string, nombre: string, clienteId: number | null, pagado = true, monto = 20000): Jugador {
  return { id, nombre, clienteId, pagado, monto }
}

// Torneos de prueba mientras el backend no está listo.
function torneosIniciales(): Torneo[] {
  const hoy = Date.now()
  const enCurso = [
    jugador('j1', 'Juan Pérez', 3),
    jugador('j2', 'Laura Gómez', 4, true, 0),
    jugador('j3', 'Carlos Ruiz', null),
    jugador('j4', 'Andrés Mora', null),
    jugador('j5', 'Pedro Díaz', null),
    jugador('j6', 'Sofía Castro', null),
    jugador('j7', 'Mateo Rojas', null),
    jugador('j8', 'Valentina León', null),
  ]
  let partidos = generarLlaves(enCurso)
  partidos = definirGanador(partidos, 'r0-p0', 'j1')
  partidos = definirGanador(partidos, 'r0-p1', 'j2')
  partidos = partidos.map((p) => (p.id === 'r0-p2' ? { ...p, mesaId: 1 } : p.id === 'r0-p3' ? { ...p, mesaId: 2 } : p))

  return [
    {
      id: 1,
      nombre: 'Torneo 8 Ball',
      modo: 'pool',
      categoria: 'abierta',
      fecha: fechaISO(hoy),
      hora: '19:00',
      cupos: 8,
      inscripcion: 20000,
      premio: '$300.000 + trofeo',
      estado: 'en-curso',
      jugadores: enCurso,
      partidos,
    },
    {
      id: 2,
      nombre: 'Copa Tres Bandas',
      modo: 'tres-bandas',
      categoria: 'avanzado',
      fecha: fechaISO(hoy + 21 * DIA),
      hora: '18:00',
      cupos: 16,
      inscripcion: 30000,
      premio: '$500.000 + trofeo',
      estado: 'inscripciones',
      jugadores: [
        jugador('c1', 'Juan Pérez', 3, true, 15000),
        jugador('c2', 'Andrés Mora', null, true, 30000),
        jugador('c3', 'Sofía Castro', null, false, 30000),
      ],
      partidos: [],
    },
    {
      id: 3,
      nombre: 'Torneo Libre',
      modo: 'libre',
      categoria: 'principiante',
      fecha: fechaISO(hoy + 35 * DIA),
      hora: '17:00',
      cupos: 8,
      inscripcion: 15000,
      premio: 'Trofeo + 5 h de mesa',
      estado: 'inscripciones',
      jugadores: [],
      partidos: [],
    },
  ]
}

const store = crearStoreLocal<Torneo[]>('billar.torneos', torneosIniciales())

export const useTorneos = store.useValor

function actualizar(torneoId: number, cambio: (t: Torneo) => Torneo) {
  store.guardar(store.obtener().map((t) => (t.id === torneoId ? cambio(t) : t)))
}

function buscar(torneoId: number) {
  return store.obtener().find((t) => t.id === torneoId)
}

export function precioInscripcion(torneo: Torneo, plan: Plan | null) {
  const descuento = Math.min(100, plan?.descuentoTorneo ?? 0)
  return Math.round((torneo.inscripcion * (100 - descuento)) / 100 / 100) * 100
}

export function cuposLibres(torneo: Torneo) {
  return torneo.cupos - torneo.jugadores.length
}

export type DatosTorneo = Omit<Torneo, 'id' | 'estado' | 'jugadores' | 'partidos'>

export function crearTorneo(datos: DatosTorneo) {
  const torneos = store.obtener()
  const id = Math.max(0, ...torneos.map((t) => t.id)) + 1
  const torneo: Torneo = { ...datos, id, estado: 'inscripciones', jugadores: [], partidos: [] }
  store.guardar([...torneos, torneo])
  registrarMovimiento({ tipo: 'torneo', titulo: datos.nombre, detalle: `Torneo creado · ${NOMBRES_MODO[datos.modo]}` })
  // Lleva a la lista de torneos, que es donde el cliente se inscribe.
  notificarClientes(
    'torneo',
    `Nuevo torneo · ${datos.nombre}`,
    `${NOMBRES_MODO[datos.modo]} · ${NOMBRES_CATEGORIA[datos.categoria]} · ${formatearFechaTorneo(torneo)}. ` +
      `${datos.cupos} cupos, inscripción ${datos.inscripcion > 0 ? formatearPesos(datos.inscripcion) : 'gratis'}. ¡Inscríbete antes de que se acaben!`,
    '/cliente/torneos',
  )
  return id
}

export function validarInscripcion(torneo: Torneo, clienteId: number | null): string | null {
  if (torneo.estado !== 'inscripciones') return 'Las inscripciones están cerradas.'
  if (cuposLibres(torneo) <= 0) return 'No quedan cupos.'
  if (clienteId !== null && torneo.jugadores.some((j) => j.clienteId === clienteId)) return 'Este cliente ya está inscrito.'
  return null
}

// Devuelve un mensaje de error, o null si quedó inscrito. Si se inscribe el propio cliente, se avisa al admin.
export function inscribir(
  torneoId: number,
  datos: { clienteId: number | null; nombre: string; pagado: boolean; monto: number },
  origen: 'cliente' | 'admin' = 'admin',
): string | null {
  const torneo = buscar(torneoId)
  if (!torneo) return 'El torneo no existe.'
  const error = validarInscripcion(torneo, datos.clienteId)
  if (error) return error
  const nuevo: Jugador = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...datos }
  actualizar(torneoId, (t) => ({ ...t, jugadores: [...t.jugadores, nuevo] }))
  registrarMovimiento({
    tipo: 'torneo',
    titulo: torneo.nombre,
    detalle: `Inscripción · ${datos.nombre}${datos.pagado ? '' : ' (pendiente de pago)'}`,
  })
  notificar(
    datos.clienteId,
    'torneo',
    datos.pagado ? `Inscripción confirmada · ${torneo.nombre}` : `Inscripción pendiente de pago · ${torneo.nombre}`,
    datos.pagado
      ? `Quedaste inscrito para el ${formatearFechaTorneo(torneo)}. ¡Mucha suerte!`
      : `Reservamos tu cupo. Paga ${formatearPesos(datos.monto)} en caja antes del torneo para confirmarlo.`,
    rutaCliente(torneoId),
  )
  if (origen === 'cliente') {
    notificarAdministradores(
      'torneo',
      `Nueva inscripción · ${torneo.nombre}`,
      `${datos.nombre} se inscribió${datos.pagado ? '' : ` y debe pagar ${formatearPesos(datos.monto)} en caja`}. ` +
        `Quedan ${cuposLibres(torneo) - 1} cupos.`,
      rutaAdmin(torneoId),
    )
  }
  return null
}

export function marcarPagado(torneoId: number, jugadorId: string) {
  const torneo = buscar(torneoId)
  const jugador = torneo?.jugadores.find((j) => j.id === jugadorId)
  if (torneo && jugador) {
    notificar(jugador.clienteId, 'torneo', `Pago recibido · ${torneo.nombre}`, `Tu inscripción quedó confirmada. Nos vemos el ${formatearFechaTorneo(torneo)}.`, rutaCliente(torneoId))
  }
  actualizar(torneoId, (t) => ({
    ...t,
    jugadores: t.jugadores.map((j) => (j.id === jugadorId ? { ...j, pagado: true } : j)),
  }))
}

// Solo antes de iniciar: con las llaves armadas ya no se puede sacar a nadie.
export function quitarJugador(torneoId: number, jugadorId: string, motivo: 'retiro' | 'admin' = 'admin') {
  const torneo = buscar(torneoId)
  const jugador = torneo?.jugadores.find((j) => j.id === jugadorId)
  if (!torneo || !jugador || torneo.estado !== 'inscripciones') return
  actualizar(torneoId, (t) => ({ ...t, jugadores: t.jugadores.filter((j) => j.id !== jugadorId) }))
  registrarMovimiento({
    tipo: 'torneo',
    titulo: torneo.nombre,
    detalle: `${motivo === 'retiro' ? 'Se retiró' : 'Inscripción anulada'} · ${jugador.nombre}`,
  })
  notificar(
    jugador.clienteId,
    'torneo',
    `${motivo === 'retiro' ? 'Te retiraste de' : 'Inscripción anulada en'} ${torneo.nombre}`,
    motivo === 'retiro' ? 'Liberamos tu cupo. Puedes volver a inscribirte mientras haya cupos.' : 'El club anuló tu inscripción. Si tienes dudas, acércate a la caja.',
    rutaCliente(torneoId),
  )
  if (motivo === 'retiro') {
    notificarAdministradores(
      'torneo',
      `Retiro · ${torneo.nombre}`,
      `${jugador.nombre} se retiró del torneo. Ahora quedan ${cuposLibres(torneo) + 1} cupos.`,
      rutaAdmin(torneoId),
    )
  }
}

// El cliente puede retirarse solo si no hay dinero que devolver; si pagó, la devolución se hace en caja.
export function puedeRetirarse(torneo: Torneo, jugador: Jugador) {
  return torneo.estado === 'inscripciones' && (!jugador.pagado || jugador.monto === 0)
}

export function iniciarTorneo(torneoId: number) {
  const torneo = buscar(torneoId)
  if (!torneo || torneo.estado !== 'inscripciones' || torneo.jugadores.length < 2) return
  if (torneo.jugadores.some((j) => !j.pagado)) return
  const partidos = generarLlaves(torneo.jugadores)
  actualizar(torneoId, (t) => ({ ...t, estado: 'en-curso', partidos }))
  for (const j of torneo.jugadores) {
    const partido = partidos.find((p) => !p.ganador && (p.a === j.id || p.b === j.id))
    const rival = partido && torneo.jugadores.find((x) => x.id === (partido.a === j.id ? partido.b : partido.a))?.nombre
    notificar(
      j.clienteId,
      'torneo',
      `Las llaves de ${torneo.nombre} están listas`,
      rival ? `Tu primer partido es contra ${rival}.` : 'Tienes pase directo a la siguiente ronda.',
      rutaCliente(torneoId),
    )
  }
  registrarMovimiento({ tipo: 'torneo', titulo: torneo.nombre, detalle: `Torneo iniciado · ${torneo.jugadores.length} jugadores` })
}

export function asignarMesa(torneoId: number, partidoId: string, mesaId: number | null) {
  actualizar(torneoId, (t) => ({
    ...t,
    partidos: t.partidos.map((p) => (p.id === partidoId ? { ...p, mesaId } : p)),
  }))
}

export function registrarGanador(torneoId: number, partidoId: string, jugadorId: string) {
  const torneo = buscar(torneoId)
  if (!torneo || torneo.estado !== 'en-curso') return
  const partidos = definirGanador(torneo.partidos, partidoId, jugadorId)
  // Resultado no válido (el partido siguiente ya se jugó o el jugador no está en ese partido).
  if (partidos === torneo.partidos) return
  const ganador = campeon(partidos)
  actualizar(torneoId, (t) => ({ ...t, partidos, estado: ganador ? 'finalizado' : t.estado }))
  if (ganador) {
    const nombre = torneo.jugadores.find((j) => j.id === ganador)?.nombre ?? ''
    registrarMovimiento({ tipo: 'torneo', titulo: torneo.nombre, detalle: `Campeón · ${nombre}` })
  }
  const partido = torneo.partidos.find((p) => p.id === partidoId)
  const perdedorId = partido && (partido.a === jugadorId ? partido.b : partido.a)
  const ganadorJ = torneo.jugadores.find((j) => j.id === jugadorId)
  const perdedorJ = torneo.jugadores.find((j) => j.id === perdedorId)
  if (ganadorJ && partido) {
    notificar(
      ganadorJ.clienteId,
      'torneo',
      ganador ? `¡Eres campeón de ${torneo.nombre}!` : `Ganaste tu partido en ${torneo.nombre}`,
      ganador ? `Felicitaciones. Reclama tu premio en caja: ${torneo.premio}.` : `Avanzas a ${nombreRonda(partido.ronda + 1, totalRondas(partidos))}.`,
      rutaCliente(torneoId),
    )
  }
  if (perdedorJ) notificar(perdedorJ.clienteId, 'torneo', `Resultado en ${torneo.nombre}`, 'Esta vez no se dio. ¡Gracias por jugar, te esperamos en el próximo torneo!', rutaCliente(torneoId))
}

export function nombreJugador(torneo: Torneo, jugadorId: string | null) {
  return torneo.jugadores.find((j) => j.id === jugadorId)?.nombre ?? null
}
