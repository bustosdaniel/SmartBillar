import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MODOS, NOMBRES_MODO } from '../../../mesas/datos'
import { guardarTarifas, NOMBRES_DIA, obtenerTarifas } from '../../../mesas/tarifas'
import type { ConfigTarifas, ModoJuego, ReglaHorario } from '../../../types'

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

export function DialogoTarifas({ onListo }: { onListo: () => void }) {
  // Se edita una copia y solo se guarda al confirmar.
  const [config, setConfig] = useState<ConfigTarifas>(obtenerTarifas)

  function cambiarPrecio(modo: ModoJuego, valor: string) {
    setConfig((c) => ({
      ...c,
      porModo: { ...c.porModo, [modo]: { hora: Math.max(0, Number(valor) || 0) } },
    }))
  }

  function cambiarRegla(id: string, cambio: Partial<ReglaHorario>) {
    setConfig((c) => ({ ...c, reglas: c.reglas.map((r) => (r.id === id ? { ...r, ...cambio } : r)) }))
  }

  // Se calcula sobre el estado más reciente para no perder clics seguidos.
  function alternarDia(reglaId: string, dia: number) {
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
                  min={0}
                  step={500}
                  aria-label={`${NOMBRES_MODO[modo]} por hora`}
                  value={config.porModo[modo].hora}
                  onChange={(e) => cambiarPrecio(modo, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="titulo-bloque">Tarifas por horario</h3>
      <p className="nota">
        Ajustan el precio base según el día y la hora en que se inicia la mesa. Negativo es descuento (ej. −20) y positivo,
        recargo (ej. 15).
      </p>
      {config.reglas.map((r) => (
        <div key={r.id} className="regla">
          <div className="regla-fila">
            <input
              aria-label="Nombre de la tarifa"
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
                min={-100}
                max={200}
                value={r.ajuste}
                onChange={(e) => cambiarRegla(r.id, { ajuste: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="boton boton-secundario boton-chico" onClick={agregarRegla}>
        <Plus size={15} aria-hidden="true" /> Agregar tarifa por horario
      </button>

      <p className="nota">Los cambios aplican a las mesas que se inicien desde ahora; las que ya están en juego conservan su precio.</p>
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton"
          onClick={() => {
            guardarTarifas({ ...config, reglas: config.reglas.filter((r) => r.dias.length > 0 && r.nombre.trim()) })
            onListo()
          }}
        >
          Guardar tarifas
        </button>
      </div>
    </div>
  )
}
