import { useState } from 'react'
import { Banknote, CupSoda, Pause, Play, Plus, Square, Trash2, User } from 'lucide-react'
import { useEsAdministrador } from '../../../auth/useAuth'
import { eliminarMesa, NOMBRES_MODO, TEXTO_ESTADO_MESA } from '../../../mesas/datos'
import { IMAGEN_MODO } from '../../../mesas/imagenes'
import type { CuentaMesa } from '../../../mesas/cuenta'
import { estadoMesa, pausarSesion, reanudarSesion, tiempoJugado } from '../../../mesas/sesiones'
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
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const esAdministrador = useEsAdministrador()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  // Pausar y reanudar van al backend: el botón se bloquea mientras responde.
  async function accion(operacion: (mesaId: number) => Promise<void>) {
    if (ocupado) return
    setOcupado(true)
    setError('')
    try {
      await operacion(mesa.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <article className={`tarjeta mesa mesa-${estado}`}>
      <header className="mesa-cabecera">
        <div>
          <h3>{mesa.nombre}</h3>
          <span className="mesa-modo">{NOMBRES_MODO[mesa.modo]}</span>
          <span className="mesa-modo">{formatearPesos(base.hora)}/h</span>
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
          {error && (
            <p role="alert" className="alerta-clara">
              {error}
            </p>
          )}
          <div className="mesa-acciones">
            {estado === 'por-cobrar' ? (
              <>
                <button type="button" className="boton boton-secundario" onClick={() => accion(reanudarSesion)} disabled={ocupado}>
                  <Play size={16} aria-hidden="true" /> Reanudar
                </button>
                <button type="button" className="boton" onClick={onFinalizar}>
                  <Banknote size={16} aria-hidden="true" /> Cobrar
                </button>
              </>
            ) : (
              <>
                {estado === 'pausada' ? (
                  <button type="button" className="boton boton-secundario" onClick={() => accion(reanudarSesion)} disabled={ocupado}>
                    <Play size={16} aria-hidden="true" /> Reanudar
                  </button>
                ) : (
                  <button type="button" className="boton boton-secundario" onClick={() => accion(pausarSesion)} disabled={ocupado}>
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
      ) : confirmarEliminar ? (
        <div className="confirmar-anular" role="alertdialog" aria-label={`Eliminar ${mesa.nombre}`}>
          <p>
            ¿Eliminar la <strong>{mesa.nombre}</strong>? Si ya se jugó en ella, su historial se conserva en los reportes.
          </p>
          <div className="dialogo-acciones">
            <button type="button" className="boton boton-secundario" onClick={() => setConfirmarEliminar(false)} disabled={ocupado}>
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-peligro"
              disabled={ocupado}
              onClick={async () => {
                await accion(eliminarMesa)
                setConfirmarEliminar(false)
              }}
            >
              {ocupado ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
          {error && (
            <p role="alert" className="alerta-clara">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="alerta-clara">
              {error}
            </p>
          )}
          <div className="mesa-acciones">
            <button type="button" className="boton" onClick={onIniciar}>
              <Play size={16} aria-hidden="true" /> Iniciar
            </button>
            {esAdministrador && (
              <button
                type="button"
                className="boton-icono boton-icono-claro"
                aria-label={`Eliminar ${mesa.nombre}`}
                title="Eliminar mesa"
                onClick={() => {
                  setError('')
                  setConfirmarEliminar(true)
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}
