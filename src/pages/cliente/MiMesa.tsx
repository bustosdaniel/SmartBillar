import { Link } from 'react-router'
import { Banknote, CirclePause, Info, Timer } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { useAhora } from '../../hooks/useAhora'
import { mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { IMAGEN_MODO } from '../../mesas/imagenes'
import { useCalculadoraCuenta } from '../../mesas/cuenta'
import {
  estadoMesa,
  sesionDelCliente,
  tiempoJugado,
  useSesiones,
  useSesionesFinalizadas,
} from '../../mesas/sesiones'
import { formatearDuracion, formatearFecha, formatearHora, formatearPesos } from '../../utils/formato'

const MEDIA_HORA = 30 * 60 * 1000

const TEXTO_ESTADO_CLIENTE = {
  libre: '',
  'en-uso': 'Jugando',
  pausada: 'En pausa',
  'por-cobrar': 'Por pagar',
}

export function MiMesa() {
  const { usuario } = useAuth()
  const sesiones = useSesiones()
  const finalizadas = useSesionesFinalizadas()
  const ahora = useAhora()
  const calcular = useCalculadoraCuenta()

  const sesion = sesionDelCliente(sesiones, usuario?.id)
  const mesa = sesion && mesasMock.find((m) => m.id === sesion.mesaId)

  if (!sesion || !mesa) {
    const ultima = finalizadas.findLast((s) => s.clienteId === usuario?.id)
    const mesaUltima = ultima && mesasMock.find((m) => m.id === ultima.mesaId)
    return (
      <section className="pagina">
        <Encabezado titulo="Mi mesa" subtitulo="Tu sesión de juego en vivo" />
        <div className="tarjeta sin-mesa">
          <Timer size={36} aria-hidden="true" />
          <h2>No tienes una mesa activa</h2>
          <p className="texto-suave">
            Acércate a la caja para que te asignen una. El tiempo empieza a contar cuando te entreguen las bolas y
            aquí lo verás en vivo.
          </p>
        </div>
        {ultima && mesaUltima && (
          <div className="tarjeta panel-bloque">
            <h2 className="titulo-bloque">Tu última partida</h2>
            <dl className="resumen">
              <div>
                <dt>Fecha</dt>
                <dd>
                  {formatearFecha(ultima.fin)} · {formatearHora(ultima.inicio)} – {formatearHora(ultima.fin)}
                </dd>
              </div>
              <div>
                <dt>Mesa</dt>
                <dd>
                  {mesaUltima.nombre} · {NOMBRES_MODO[mesaUltima.modo]}
                </dd>
              </div>
              <div>
                <dt>Tiempo jugado</dt>
                <dd>{formatearDuracion(ultima.tiempoMs)}</dd>
              </div>
              <div className="resumen-total">
                <dt>Total pagado</dt>
                <dd>{formatearPesos(ultima.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    )
  }

  const estado = estadoMesa(sesion)
  const pausada = estado === 'pausada'
  const porCobrar = estado === 'por-cobrar'
  const tiempo = tiempoJugado(sesion, ahora)
  const cuenta = calcular(sesion, mesa, ahora)
  // Cuánto pagaría si juega media hora más.
  const siSigue = calcular({ ...sesion, inicio: sesion.inicio - MEDIA_HORA }, mesa, ahora)

  return (
    <section className="pagina">
      <Encabezado titulo="Mi mesa" subtitulo="Tu sesión de juego en vivo" />

      <div className={`mi-mesa ${pausada ? 'mi-mesa-pausada' : ''} ${porCobrar ? 'mi-mesa-por-cobrar' : ''}`} style={{ backgroundImage: `url(${IMAGEN_MODO[mesa.modo]})` }}>
        <div className="mi-mesa-contenido">
          <span className={`estado estado-${estado}`}>{TEXTO_ESTADO_CLIENTE[estado]}</span>
          <h2>
            {mesa.nombre} · {NOMBRES_MODO[mesa.modo]}
          </h2>
          <span className="mi-mesa-cronometro" role="timer" aria-live="off">
            {formatearDuracion(tiempo)}
          </span>
          <span className="mi-mesa-costo">
            {porCobrar ? 'Total a pagar' : 'Llevas'} <strong>{formatearPesos(cuenta.total)}</strong>
          </span>
          {cuenta.plan && cuenta.subtotal > cuenta.total && (
            <span className="mi-mesa-ahorro">
              Ahorras {formatearPesos(cuenta.subtotal - cuenta.total)} con tu plan {cuenta.plan.nombre}
            </span>
          )}
        </div>
      </div>

      {porCobrar && (
        <p className="aviso-claro aviso-azul">
          <Banknote size={18} aria-hidden="true" /> Tu tiempo terminó. Acércate a la caja para pagar.
        </p>
      )}

      {pausada && (
        <p className="aviso-claro aviso-ambar">
          <CirclePause size={18} aria-hidden="true" /> Tu mesa está en pausa: el tiempo no corre ni se cobra.
        </p>
      )}

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Inició</span>
          <strong>{formatearHora(sesion.inicio)}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Tarifa</span>
          <strong>{formatearPesos(cuenta.tarifaHora)}/h</strong>
          {sesion.regla && <span>{sesion.regla}</span>}
        </div>
        <Link to="/cliente/consumos" className="tarjeta dato dato-enlace">
          <span>Consumos</span>
          <strong>{formatearPesos(cuenta.consumos)}</strong>
        </Link>
        {!porCobrar && (
          <div className="tarjeta dato">
            <span>Con 30 min más pagarías</span>
            <strong>{formatearPesos(siSigue.total)}</strong>
          </div>
        )}
      </div>

      <p className="nota nota-icono">
        <Info size={16} aria-hidden="true" /> El tiempo lo controla el personal del club. Se detiene cuando devuelves
        las bolas en la caja.
      </p>
    </section>
  )
}
