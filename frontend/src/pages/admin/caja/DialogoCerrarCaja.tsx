import { useState } from 'react'
import { cerrarCaja, efectivoEsperado, textoDiferencia, totalEgresos } from '../../../caja/caja'
import type { Caja } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

export function DialogoCerrarCaja({ caja, onListo }: { caja: Caja; onListo: () => void }) {
  const [contado, setContado] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cerrar() {
    setError('')
    setEnviando(true)
    try {
      await cerrarCaja(Number(contado) || 0, nota.trim())
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja.')
      setEnviando(false)
    }
  }

  const esperado = efectivoEsperado(caja)
  const total = caja.pagos.reduce((suma, p) => suma + p.monto, 0)
  const hayConteo = contado.trim() !== ''
  const diferencia = (Number(contado) || 0) - esperado

  return (
    <div className="formulario-claro">
      <dl className="resumen">
        <div>
          <dt>Pagos registrados</dt>
          <dd>{caja.pagos.length}</dd>
        </div>
        <div>
          <dt>Total cobrado (todos los métodos)</dt>
          <dd>{formatearPesos(total)}</dd>
        </div>
        <div>
          <dt>Egresos</dt>
          <dd>−{formatearPesos(totalEgresos(caja))}</dd>
        </div>
        <div className="resumen-total">
          <dt>Efectivo que debe haber</dt>
          <dd>{formatearPesos(esperado)}</dd>
        </div>
      </dl>

      <label>
        Efectivo contado en el cajón
        <input
          type="number"
          min={0}
          step={100}
          inputMode="numeric"
          value={contado}
          onChange={(e) => setContado(e.target.value)}
          placeholder="Cuenta billetes y monedas"
          autoFocus
        />
      </label>
      <div className="billetes">
        <button type="button" onClick={() => setContado(String(esperado))}>
          Cuadra exacto
        </button>
      </div>

      {hayConteo && (
        <div className={`cambio ${diferencia < 0 ? 'cambio-falta' : diferencia > 0 ? 'cambio-sobra' : ''}`}>
          <span>Arqueo</span>
          <strong>{textoDiferencia(diferencia)}</strong>
        </div>
      )}

      {hayConteo && diferencia !== 0 && (
        <label>
          Observación (obligatoria si no cuadra)
          <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: se dio mal un cambio" />
        </label>
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
        <button
          type="button"
          className="boton boton-peligro"
          disabled={enviando || !hayConteo || (diferencia !== 0 && !nota.trim())}
          onClick={cerrar}
        >
          Cerrar caja
        </button>
      </div>
    </div>
  )
}
