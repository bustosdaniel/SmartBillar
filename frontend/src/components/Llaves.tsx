import { Check, Trophy } from 'lucide-react'
import { mesasMock } from '../mesas/datos'
import { campeon, nombreRonda, puedeDefinirse, totalRondas } from '../torneos/llaves'
import { asignarMesa, nombreJugador, registrarGanador } from '../torneos/torneos'
import type { Partido, Torneo } from '../types'

type LlavesProps = {
  torneo: Torneo
  editable?: boolean
  // Jugador a resaltar (el cliente que está mirando).
  resaltar?: string | null
}

type LadoProps = {
  torneo: Torneo
  partido: Partido
  lado: 'a' | 'b'
  editable: boolean
  resaltar: string | null
}

function Lado({ torneo, partido, lado, editable, resaltar }: LadoProps) {
  const jugadorId = partido[lado]
  const nombre = nombreJugador(torneo, jugadorId)
  const gano = partido.ganador !== null && partido.ganador === jugadorId
  const perdio = partido.ganador !== null && jugadorId !== null && !gano
  const vacio = partido.ronda === 0 ? 'Pase directo' : 'Por definir'
  const definible = editable && jugadorId !== null && puedeDefinirse(torneo.partidos, partido)

  return (
    <div className={`llave-jugador ${gano ? 'gano' : ''} ${perdio ? 'perdio' : ''} ${jugadorId && jugadorId === resaltar ? 'resaltado' : ''}`}>
      <span className={nombre ? '' : 'texto-suave'}>{nombre ?? vacio}</span>
      {gano && <Check size={15} aria-label="Ganador" />}
      {definible && !gano && (
        <button type="button" className="boton-ganador" onClick={() => registrarGanador(torneo.id, partido.id, jugadorId)}>
          Ganó
        </button>
      )}
    </div>
  )
}

export function Llaves({ torneo, editable = false, resaltar = null }: LlavesProps) {
  const rondas = totalRondas(torneo.partidos)
  const mesas = mesasMock.filter((m) => m.modo === torneo.modo)
  const ganadorTorneo = campeon(torneo.partidos)

  return (
    <div className="llaves">
      {Array.from({ length: rondas }, (_, ronda) => (
        <div key={ronda} className="llaves-ronda">
          <h3>{nombreRonda(ronda, rondas)}</h3>
          <div className="llaves-partidos">
            {torneo.partidos
              .filter((p) => p.ronda === ronda)
              .map((partido) => {
                const pase = partido.ronda === 0 && (partido.a === null || partido.b === null)
                const pendiente = !partido.ganador && partido.a !== null && partido.b !== null
                return (
                  <div key={partido.id} className={`llave ${pase ? 'llave-pase' : ''}`}>
                    <Lado torneo={torneo} partido={partido} lado="a" editable={editable} resaltar={resaltar} />
                    <Lado torneo={torneo} partido={partido} lado="b" editable={editable} resaltar={resaltar} />
                    {!pase && (editable && pendiente ? (
                      <label className="llave-mesa">
                        <span>Mesa</span>
                        <select
                          value={partido.mesaId ?? ''}
                          onChange={(e) => asignarMesa(torneo.id, partido.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Sin asignar</option>
                          {mesas.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      partido.mesaId !== null && pendiente && <span className="llave-mesa-texto">Mesa {partido.mesaId}</span>
                    ))}
                  </div>
                )
              })}
          </div>
        </div>
      ))}
      <div className="llaves-ronda llaves-campeon">
        <h3>Campeón</h3>
        <div className={`campeon ${ganadorTorneo ? 'definido' : ''}`}>
          <Trophy size={28} aria-hidden="true" />
          <strong>{nombreJugador(torneo, ganadorTorneo) ?? 'Por definir'}</strong>
        </div>
      </div>
    </div>
  )
}
