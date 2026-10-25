import { useState } from 'react'
import { registrarEgreso, useCaja } from '../../../caja/caja'
import { AbrirCaja } from '../../../components/AbrirCaja'
import { quitarJugador } from '../../../torneos/torneos'
import type { Jugador, Torneo } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

export function DialogoQuitar({ torneo, jugador, onListo }: { torneo: Torneo; jugador: Jugador; onListo: () => void }) {
  const caja = useCaja()
  const pagoDinero = jugador.pagado && jugador.monto > 0
  const [devolver, setDevolver] = useState(pagoDinero)
  const [error, setError] = useState('')

  async function confirmar() {
    setError('')
    if (devolver) {
      try {
        await registrarEgreso(`Devolución inscripción ${torneo.nombre} · ${jugador.nombre}`, jugador.monto)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo registrar la devolución.')
        return
      }
    }
    quitarJugador(torneo.id, jugador.id)
    onListo()
  }

  return (
    <div className="formulario-claro">
      <p>
        Se quitará a <strong>{jugador.nombre}</strong> de {torneo.nombre} y su cupo quedará libre.
      </p>
      {pagoDinero && (
        <label className="check-claro">
          <input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} />
          Devolver {formatearPesos(jugador.monto)} en efectivo desde la caja
        </label>
      )}
      {devolver && !caja && (
        <div className="caja-cerrada">
          <p>
            <strong>La caja está cerrada.</strong> Ábrela para registrar la devolución.
          </p>
          <AbrirCaja />
        </div>
      )}
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="button" className="boton boton-peligro" onClick={confirmar} disabled={devolver && !caja}>
          {devolver ? 'Devolver y quitar' : 'Quitar jugador'}
        </button>
      </div>
    </div>
  )
}
