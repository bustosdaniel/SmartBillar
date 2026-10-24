import { Banknote, CupSoda, Minus, Pause, Play, Plus, Square, User } from 'lucide-react'
import { NOMBRES_MODO, TEXTO_ESTADO_MESA } from '../../../mesas/datos'
import { IMAGEN_MODO } from '../../../mesas/imagenes'
import type { CuentaMesa } from '../../../mesas/cuenta'
import {
  cambiarPartidas,
  estadoMesa,
  pausarSesion,
  reanudarDetenida,
  reanudarSesion,
  tiempoJugado,
} from '../../../mesas/sesiones'
import { useTarifas } from '../../../mesas/tarifas'
import type { Mesa, Sesion } from '../../../types'
import { formatearDuracion, formatearHora, formatearPesos } from '../../../utils/formato'

type TarjetaMesaProps = {
  mesa: Mesa
  sesion: Sesion | undefined
  ahora: number
  cuenta: CuentaMesa | null
  onIniciar: () => void
  onFinalizar: () => void
  onConsumo: () => void
}

export function TarjetaMesa({ mesa, sesion, ahora, cuenta, onIniciar, onFinalizar, onConsumo }: TarjetaMesaProps) {
  const estado = estadoMesa(sesion)
  const tiempo = sesion ? tiempoJugado(sesion, ahora) : 0
  const base = useTarifas().porModo[mesa.modo]
  const porPartida = cuenta?.modoCobro === 'partida'

  return (
    <article className={`tarjeta mesa mesa-${estado}`}>
      <header className="mesa-cabecera">
        <div>
          <h3>{mesa.nombre}</h3>
          <span className="mesa-modo">{NOMBRES_MODO[mesa.modo]}</span>
          <span className="mesa-modo">{formatearPesos(base.hora)}/h</span>
          <span className="mesa-modo">{formatearPesos(base.partida)} por partida</span>
        </div>
        <span className={`estado estado-${estado}`}>{TEXTO_ESTADO_MESA[estado]}</span>
      </header>

      <img className="mesa-foto" src={IMAGEN_MODO[mesa.modo]} alt="" />

      {sesion ? (
        <>
          <div className="mesa-sesion">
            <span className="mesa-cliente">
              <User size={15} aria-hidden="true" />
              {sesion.clienteNombre}
              {cuenta?.plan && (
                <span className={`insignia-plan insignia-${cuenta.plan.id} insignia-chica`}>{cuenta.plan.nombre}</span>
              )}
            </span>
            <span className="cronometro" role="timer" aria-label={`Tiempo jugado en ${mesa.nombre}`}>
              {formatearDuracion(tiempo)}
            </span>
            <span className="mesa-detalle">
              Inició {formatearHora(sesion.inicio)} · <strong>{formatearPesos(cuenta?.total ?? 0)}</strong>
            </span>
            {sesion.regla && <span className="insignia-regla">{sesion.regla}</span>}
            {porPartida && cuenta && (
              <div className="contador-partidas">
                <span>
                  <strong>{cuenta.partidas}</strong> × {formatearPesos(cuenta.precioPartida)}
                </span>
                {estado !== 'por-cobrar' && (
                  <span className="contador-botones">
                    <button
                      type="button"
                      className="boton-icono boton-icono-claro"
                      aria-label="Quitar una partida"
                      disabled={cuenta.partidas <= 1}
                      onClick={() => cambiarPartidas(mesa.id, -1)}
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      type="button"
                      className="boton-icono boton-icono-claro"
                      aria-label="Sumar una partida"
                      onClick={() => cambiarPartidas(mesa.id, 1)}
                    >
                      <Plus size={15} />
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="mesa-consumos">
              <span>
                <CupSoda size={15} aria-hidden="true" /> Consumos{' '}
                <strong>{formatearPesos(cuenta?.consumos ?? 0)}</strong>
              </span>
              <button
                type="button"
                className="boton-icono boton-icono-claro"
                aria-label={`Agregar consumo a ${mesa.nombre}`}
                onClick={onConsumo}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div className="mesa-acciones">
            {estado === 'por-cobrar' ? (
              <>
                <button type="button" className="boton boton-secundario" onClick={() => reanudarDetenida(mesa.id)}>
                  <Play size={16} aria-hidden="true" /> Reanudar
                </button>
                <button type="button" className="boton" onClick={onFinalizar}>
                  <Banknote size={16} aria-hidden="true" /> Cobrar
                </button>
              </>
            ) : (
              <>
                {estado === 'pausada' ? (
                  <button type="button" className="boton boton-secundario" onClick={() => reanudarSesion(mesa.id)}>
                    <Play size={16} aria-hidden="true" /> Reanudar
                  </button>
                ) : (
                  <button type="button" className="boton boton-secundario" onClick={() => pausarSesion(mesa.id)}>
                    <Pause size={16} aria-hidden="true" /> Pausar
                  </button>
                )}
                <button type="button" className="boton boton-peligro" onClick={onFinalizar}>
                  <Square size={16} aria-hidden="true" /> Finalizar
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mesa-acciones">
          <button type="button" className="boton" onClick={onIniciar}>
            <Play size={16} aria-hidden="true" /> Iniciar
          </button>
        </div>
      )}
    </article>
  )
}
