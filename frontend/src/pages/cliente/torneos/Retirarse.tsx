import { useState } from 'react'
import { Modal } from '../../../components/Modal'
import { puedeRetirarse, quitarJugador } from '../../../torneos/torneos'
import type { Jugador, Torneo } from '../../../types'

type RetirarseProps = {
  torneo: Torneo
  jugador: Jugador
  // En la tarjeta solo va el botón; en el detalle también se explica cuando hay que ir a caja.
  conAviso?: boolean
}

export function Retirarse({ torneo, jugador, conAviso = false }: RetirarseProps) {
  const [confirmando, setConfirmando] = useState(false)

  if (torneo.estado !== 'inscripciones') return null
  if (!puedeRetirarse(torneo, jugador)) {
    return conAviso ? (
      <p className="nota">Ya pagaste tu inscripción. Si no vas a jugar, acércate a caja para retirarte y recibir la devolución.</p>
    ) : null
  }

  return (
    <>
      <button type="button" className="boton boton-peligro boton-chico" onClick={() => setConfirmando(true)}>
        Ya no participo
      </button>
      <Modal abierto={confirmando} titulo="Retirarte del torneo" onCerrar={() => setConfirmando(false)}>
        <div className="formulario-claro">
          <p>
            ¿Seguro que ya no vas a jugar <strong>{torneo.nombre}</strong>? Tu cupo quedará libre para otro jugador.
          </p>
          <div className="dialogo-acciones">
            <button type="button" className="boton boton-secundario" onClick={() => setConfirmando(false)}>
              Seguir inscrito
            </button>
            <button
              type="button"
              className="boton boton-peligro"
              onClick={() => {
                quitarJugador(torneo.id, jugador.id, 'retiro')
                setConfirmando(false)
              }}
            >
              Sí, me retiro
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
