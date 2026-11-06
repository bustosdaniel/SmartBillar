import { formatearPesos } from '../utils/formato'

export function TotalesPeriodo({ ingresos, egresos }: { ingresos: number; egresos: number }) {
  return (
    <div className="totales-periodo">
      <div className="total-periodo total-ingresos">
        <span>Ingresos</span>
        <strong>{formatearPesos(ingresos)}</strong>
      </div>
      <div className="total-periodo total-egresos">
        <span>Egresos</span>
        <strong>{formatearPesos(egresos)}</strong>
      </div>
      <div className="total-periodo total-neto">
        <span>Total</span>
        <strong>{formatearPesos(ingresos - egresos)}</strong>
      </div>
    </div>
  )
}
