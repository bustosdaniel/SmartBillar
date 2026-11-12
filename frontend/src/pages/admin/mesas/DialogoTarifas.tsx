import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MODOS, NOMBRES_MODO } from '../../../mesas/datos'
import { guardarTarifas, NOMBRES_DIA, obtenerTarifas } from '../../../mesas/tarifas'
import type { ConfigTarifas, ModoJuego, ReglaHorario } from '../../../types'
import { errorNumero, leerNumero, LIMITES, mostrarNumero } from '../../../utils/montos'

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

type ErroresRegla = Partial<Record<'nombre' | 'dias' | 'horas' | 'ajuste', string>>

function erroresDeRegla(r: ReglaHorario): ErroresRegla {
  const errores: ErroresRegla = {}
  if (!r.nombre.trim()) errores.nombre = 'Ponle un nombre a la tarifa.'
  if (r.dias.length === 0) errores.dias = 'Elige al menos un día.'
  if (!r.desde || !r.hasta) errores.horas = 'Indica la hora de inicio y de fin.'
  else if (r.desde === r.hasta) errores.horas = 'La hora de inicio y la de fin no pueden ser iguales.'
  const ajuste = errorNumero(r.ajuste, LIMITES.ajusteTarifa)
  if (ajuste) errores.ajuste = ajuste
  return errores
}

export function DialogoTarifas({ onListo }: { onListo: () => void }) {
  // Se edita una copia y solo se guarda al confirmar.
  const [config, setConfig] = useState<ConfigTarifas>(obtenerTarifas)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiarPrecio(modo: ModoJuego, valor: string) {
    setConfig((c) => ({
      ...c,
      porModo: { ...c.porModo, [modo]: { hora: leerNumero(valor) } },
    }))
  }

  function cambiarRegla(id: ReglaHorario['id'], cambio: Partial<ReglaHorario>) {
    setConfig((c) => ({ ...c, reglas: c.reglas.map((r) => (r.id === id ? { ...r, ...cambio } : r)) }))
  }

  // Se calcula sobre el estado más reciente para no perder clics seguidos.
  function alternarDia(reglaId: ReglaHorario['id'], dia: number) {
    setConfig((c) => ({
      ...c,
      reglas: c.reglas.map((r) =>
        r.id !== reglaId ? r : { ...r, dias: r.dias.includes(dia) ? r.dias.filter((d) => d !== dia) : [...r.dias, dia] },
      ),
    }))
  }

  function agregarRegla() {
    setConfig((c) => ({
      ...c,
      reglas: [
        ...c.reglas,
        { id: `regla-${Date.now()}`, nombre: 'Nueva tarifa', dias: [1, 2, 3, 4, 5], desde: '10:00', hasta: '12:00', ajuste: -10 },
      ],
    }))
  }

  const erroresPrecio = Object.fromEntries(MODOS.map((m) => [m, errorNumero(config.porModo[m].hora, LIMITES.tarifaHora)]))
  const erroresReglas = Object.fromEntries(config.reglas.map((r) => [r.id, erroresDeRegla(r)]))
  const hayErrores =
    Object.values(erroresPrecio).some(Boolean) || Object.values(erroresReglas).some((e) => Object.keys(e).length > 0)

  return (
    <div className="formulario-claro tarifas">
      <h3 className="titulo-bloque">Precios base</h3>
      <table className="tabla tabla-tarifas">
        <thead>
          <tr>
            <th>Modo</th>
            <th>Por hora</th>
          </tr>
        </thead>
        <tbody>
          {MODOS.map((modo) => (
            <tr key={modo}>
              <td>{NOMBRES_MODO[modo]}</td>
              <td>
                <input
                  type="number"
                  min={LIMITES.tarifaHora.min}
                  max={LIMITES.tarifaHora.max}
                  step={500}
                  aria-label={`${NOMBRES_MODO[modo]} por hora`}
                  aria-invalid={erroresPrecio[modo] ? true : undefined}
                  value={mostrarNumero(config.porModo[modo].hora)}
                  onChange={(e) => cambiarPrecio(modo, e.target.value)}
                />
                {erroresPrecio[modo] && (
                  <span role="alert" className="campo-error">
                    {erroresPrecio[modo]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="titulo-bloque">Tarifas por horario</h3>
      <p className="nota">
        Ajustan el precio base según el día y la hora en que se inicia la mesa. Negativo es descuento (ej. −20) y positivo,
        recargo (ej. 15), entre −100% y +100%.
      </p>
      {config.reglas.map((r) => {
        const errores = erroresReglas[r.id]
        return (
        <div key={r.id} className="regla">
          <div className="regla-fila">
            <input
              aria-label="Nombre de la tarifa"
              aria-invalid={errores.nombre ? true : undefined}
              value={r.nombre}
              onChange={(e) => cambiarRegla(r.id, { nombre: e.target.value })}
            />
            <button
              type="button"
              className="boton-icono boton-icono-claro"
              aria-label={`Eliminar ${r.nombre}`}
              onClick={() => setConfig((c) => ({ ...c, reglas: c.reglas.filter((x) => x.id !== r.id) }))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="dias" role="group" aria-label="Días">
            {ORDEN_DIAS.map((d) => (
              <button
                key={d}
                type="button"
                className={r.dias.includes(d) ? 'activo' : ''}
                aria-pressed={r.dias.includes(d)}
                onClick={() => alternarDia(r.id, d)}
              >
                {NOMBRES_DIA[d]}
              </button>
            ))}
          </div>
          <div className="regla-fila regla-horas">
            <label>
              Desde
              <input type="time" value={r.desde} onChange={(e) => cambiarRegla(r.id, { desde: e.target.value })} />
            </label>
            <label>
              Hasta
              <input type="time" value={r.hasta} onChange={(e) => cambiarRegla(r.id, { hasta: e.target.value })} />
            </label>
            <label>
              Ajuste %
              <input
                type="number"
                min={LIMITES.ajusteTarifa.min}
                max={LIMITES.ajusteTarifa.max}
                aria-invalid={errores.ajuste ? true : undefined}
                value={mostrarNumero(r.ajuste)}
                onChange={(e) => cambiarRegla(r.id, { ajuste: leerNumero(e.target.value) })}
              />
            </label>
          </div>
          {Object.values(errores).map((mensaje) => (
            <span key={mensaje} role="alert" className="campo-error">
              {mensaje}
            </span>
          ))}
        </div>
        )
      })}
      <button type="button" className="boton boton-secundario boton-chico" onClick={agregarRegla}>
        <Plus size={15} aria-hidden="true" /> Agregar tarifa por horario
      </button>

      <p className="nota">Los cambios aplican a las mesas que se inicien desde ahora; las que ya están en juego conservan su precio.</p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton"
          disabled={hayErrores || guardando}
          title={hayErrores ? 'Corrige los campos marcados para guardar.' : undefined}
          onClick={async () => {
            if (hayErrores || guardando) return
            setGuardando(true)
            setError('')
            try {
              await guardarTarifas({ ...config, reglas: config.reglas.map((r) => ({ ...r, nombre: r.nombre.trim() })) })
              onListo()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudieron guardar las tarifas.')
              setGuardando(false)
            }
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar tarifas'}
        </button>
      </div>
    </div>
  )
}
