import type { CuentaMesa } from '../mesas/cuenta'
import { formatearHorasMin, formatearPesos } from '../utils/formato'

// Líneas de la cuenta de una mesa: subtotal, horas gratis y descuento de la membresía.
export function DetalleCuenta({ cuenta, textoTotal }: { cuenta: CuentaMesa; textoTotal: string }) {
  const conBeneficios = cuenta.valorGratis > 0 || cuenta.descuento > 0
  return (
    <>
      {conBeneficios && (
        <div>
          <dt>Subtotal</dt>
          <dd>{formatearPesos(cuenta.subtotal)}</dd>
        </div>
      )}
      {cuenta.valorGratis > 0 && (
        <div className="linea-descuento">
          <dt>Horas gratis {cuenta.plan?.nombre} ({formatearHorasMin(cuenta.gratisMs)})</dt>
          <dd>−{formatearPesos(cuenta.valorGratis)}</dd>
        </div>
      )}
      {cuenta.descuento > 0 && (
        <div className="linea-descuento">
          <dt>
            Descuento {cuenta.plan?.nombre} ({cuenta.porcentaje}%)
          </dt>
          <dd>−{formatearPesos(cuenta.descuento)}</dd>
        </div>
      )}
      <div className="resumen-total">
        <dt>{textoTotal}</dt>
        <dd>{formatearPesos(cuenta.total)}</dd>
      </div>
    </>
  )
}
