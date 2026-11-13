import { useState, type FormEvent } from 'react'
import { MODOS, NOMBRES_MODO, useMesas } from '../../../mesas/datos'
import { crearTorneo, NOMBRES_CATEGORIA } from '../../../torneos/torneos'
import type { CategoriaTorneo, ModoJuego } from '../../../types'
import { errorNumero, LIMITES } from '../../../utils/montos'

const CATEGORIAS: CategoriaTorneo[] = ['abierta', 'principiante', 'avanzado']

export function DialogoCrearTorneo({ onListo }: { onListo: (id: number) => void }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [inscripcion, setInscripcion] = useState('20000')
  const mesas = useMesas()
  // Solo los modos en los que el club tiene mesas (el backend también lo exige).
  const modos = MODOS.filter((m) => mesas.some((x) => x.modo === m))
  const [modoElegido, setModoElegido] = useState<ModoJuego | null>(null)
  const modo = modoElegido && modos.includes(modoElegido) ? modoElegido : (modos[0] ?? null)
  const [cupos, setCupos] = useState(8)
  const mesasDelModo = modo ? mesas.filter((m) => m.modo === modo).length : 0
  // Eliminación directa: la primera ronda tiene cupos / 2 partidos; con menos mesas se juega por tandas.
  const partidos = cupos / 2
  const tandas = mesasDelModo > 0 ? Math.ceil(partidos / mesasDelModo) : 0
  const errorInscripcion = errorNumero(inscripcion, LIMITES.inscripcion)
  const [nombre, setNombre] = useState('')
  const [premio, setPremio] = useState('')
  // Se marcan al salir del campo o al intentar crear, no apenas se abre el formulario.
  const [tocados, setTocados] = useState({ nombre: false, premio: false })
  const errorNombre = !nombre.trim()
    ? 'Ponle un nombre al torneo.'
    : nombre.trim().length > 80
      ? 'El nombre no puede tener más de 80 caracteres.'
      : null
  const errorPremio = !premio.trim()
    ? 'Escribe el premio (ej. $300.000 + trofeo).'
    : premio.trim().length > 120
      ? 'El premio no puede tener más de 120 caracteres.'
      : null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTocados({ nombre: true, premio: true })
    if (errorInscripcion || errorNombre || errorPremio || !modo) return
    const datos = new FormData(e.currentTarget)
    setError('')
    if (!datos.get('fecha') || !datos.get('hora')) {
      setError('Elige la fecha y la hora del torneo.')
      return
    }
    setEnviando(true)
    try {
      const id = await crearTorneo({
        nombre: nombre.trim(),
        modo,
        categoria: datos.get('categoria') as CategoriaTorneo,
        fecha: String(datos.get('fecha')),
        hora: String(datos.get('hora')),
        cupos,
        inscripcion: Number(inscripcion),
        premio: premio.trim(),
      })
      onListo(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el torneo.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit} noValidate>
      <label>
        Nombre del torneo
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => setTocados((t) => ({ ...t, nombre: true }))}
          maxLength={80}
          aria-invalid={tocados.nombre && errorNombre ? true : undefined}
          autoFocus
          placeholder="Ej: Copa de Navidad"
        />
        {tocados.nombre && errorNombre && (
          <span role="alert" className="campo-error">
            {errorNombre}
          </span>
        )}
      </label>
      <div className="campos-fila">
        <label>
          Modo de juego
          <select name="modo" value={modo ?? ''} onChange={(e) => setModoElegido(e.target.value as ModoJuego)} disabled={!modo}>
            {modos.length === 0 && <option value="">Sin mesas</option>}
            {modos.map((m) => (
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
          <select name="cupos" value={cupos} onChange={(e) => setCupos(Number(e.target.value))}>
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
        <input
          name="premio"
          value={premio}
          onChange={(e) => setPremio(e.target.value)}
          onBlur={() => setTocados((t) => ({ ...t, premio: true }))}
          maxLength={120}
          aria-invalid={tocados.premio && errorPremio ? true : undefined}
          placeholder="Ej: $300.000 + trofeo"
        />
        {tocados.premio && errorPremio && (
          <span role="alert" className="campo-error">
            {errorPremio}
          </span>
        )}
      </label>
      {modo ? (
        <p className={`aviso-claro ${tandas > 1 ? 'aviso-cambio-plan' : ''}`}>
          Hay {mesasDelModo} {mesasDelModo === 1 ? 'mesa' : 'mesas'} de {NOMBRES_MODO[modo]}:{' '}
          {tandas <= 1
            ? `los ${partidos} partidos de la primera ronda se juegan a la vez.`
            : `la primera ronda (${partidos} partidos) se jugará en ${tandas} tandas.`}
        </p>
      ) : (
        <p role="alert" className="alerta-clara">
          El club no tiene mesas. Agrega al menos una en Mesas para poder crear torneos.
        </p>
      )}
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="submit" className="boton" disabled={enviando || errorInscripcion !== null || !modo}>
          Crear torneo
        </button>
      </div>
    </form>
  )
}
