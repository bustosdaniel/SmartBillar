import { useState, type FormEvent } from 'react'
import { crearMesa, MODOS, NOMBRES_MODO, nombreSugerido, useTodasLasMesas } from '../../../mesas/datos'
import type { ModoJuego } from '../../../types'

// Solo el administrador: cada club tiene las mesas que tiene, de cada modo.
export function DialogoNuevaMesa({ onListo }: { onListo: () => void }) {
  const todas = useTodasLasMesas()
  const activas = todas.filter((m) => !m.retirada)
  const [nombre, setNombre] = useState(() => nombreSugerido(activas))
  const [modo, setModo] = useState<ModoJuego>('pool')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const limpio = nombre.trim()
  const repetido = activas.some((m) => m.nombre.toLowerCase() === limpio.toLowerCase())
  const errorNombre = !limpio
    ? 'Ponle un nombre a la mesa.'
    : limpio.length > 40
      ? 'El nombre no puede tener más de 40 caracteres.'
      : repetido
        ? `Ya hay una mesa llamada «${limpio}».`
        : null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (errorNombre || enviando) return
    setEnviando(true)
    setError('')
    try {
      await crearMesa(limpio, modo)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la mesa.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <label>
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={40}
          aria-invalid={errorNombre ? true : undefined}
          autoFocus
          required
        />
        {errorNombre && (
          <span role="alert" className="campo-error">
            {errorNombre}
          </span>
        )}
      </label>
      <fieldset className="metodos">
        <legend>Modo de juego</legend>
        {MODOS.map((m) => (
          <button key={m} type="button" className={modo === m ? 'activo' : ''} aria-pressed={modo === m} onClick={() => setModo(m)}>
            {NOMBRES_MODO[m]}
            <span className="texto-suave"> ({activas.filter((x) => x.modo === m).length})</span>
          </button>
        ))}
      </fieldset>
      <p className="nota">Se cobra con la tarifa por hora de {NOMBRES_MODO[modo]} que tengas configurada en Tarifas.</p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={errorNombre !== null || enviando}>
          {enviando ? 'Agregando…' : 'Agregar mesa'}
        </button>
      </div>
    </form>
  )
}
