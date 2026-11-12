import { useState, type FormEvent } from 'react'
import { MODOS, NOMBRES_MODO } from '../../../mesas/datos'
import { crearTorneo, NOMBRES_CATEGORIA } from '../../../torneos/torneos'
import type { CategoriaTorneo, ModoJuego } from '../../../types'
import { errorNumero, LIMITES } from '../../../utils/montos'

const CATEGORIAS: CategoriaTorneo[] = ['abierta', 'principiante', 'avanzado']

export function DialogoCrearTorneo({ onListo }: { onListo: (id: number) => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [inscripcion, setInscripcion] = useState('20000')
  const errorInscripcion = errorNumero(inscripcion, LIMITES.inscripcion)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (errorInscripcion) return
    const datos = new FormData(e.currentTarget)
    setError('')
    setEnviando(true)
    try {
      const id = await crearTorneo({
        nombre: String(datos.get('nombre')).trim(),
        modo: datos.get('modo') as ModoJuego,
        categoria: datos.get('categoria') as CategoriaTorneo,
        fecha: String(datos.get('fecha')),
        hora: String(datos.get('hora')),
        cupos: Number(datos.get('cupos')),
        inscripcion: Number(inscripcion),
        premio: String(datos.get('premio')).trim(),
      })
      onListo(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el torneo.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Nombre del torneo
        <input name="nombre" required autoFocus placeholder="Ej: Copa de Navidad" />
      </label>
      <div className="campos-fila">
        <label>
          Modo de juego
          <select name="modo">
            {MODOS.map((m) => (
              <option key={m} value={m}>
                {NOMBRES_MODO[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select name="categoria">
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {NOMBRES_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="campos-fila">
        <label>
          Fecha
          <input name="fecha" type="date" required />
        </label>
        <label>
          Hora
          <input name="hora" type="time" defaultValue="19:00" required />
        </label>
      </div>
      <div className="campos-fila">
        <label>
          Cupos
          <select name="cupos" defaultValue="8">
            {[4, 8, 16, 32].map((c) => (
              <option key={c} value={c}>
                {c} jugadores
              </option>
            ))}
          </select>
        </label>
        <label>
          Valor inscripción
          <input
            name="inscripcion"
            type="number"
            inputMode="numeric"
            min={LIMITES.inscripcion.min}
            max={LIMITES.inscripcion.max}
            step={1000}
            value={inscripcion}
            onChange={(e) => setInscripcion(e.target.value)}
            aria-invalid={errorInscripcion ? true : undefined}
            required
          />
          {errorInscripcion && (
            <span role="alert" className="campo-error">
              {errorInscripcion}
            </span>
          )}
        </label>
      </div>
      <label>
        Premio
        <input name="premio" required placeholder="Ej: $300.000 + trofeo" />
      </label>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="submit" className="boton" disabled={enviando || errorInscripcion !== null}>
          Crear torneo
        </button>
      </div>
    </form>
  )
}
