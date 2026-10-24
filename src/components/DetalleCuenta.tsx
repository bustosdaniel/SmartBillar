import type { CuentaMesa } from '../mesas/cuenta'
import { formatearHorasMin, formatearPesos } from '../utils/formato'

// Líneas de la cuenta de una mesa: mesa, horas gratis, descuento de la membresía y consumos.
export function DetalleCuenta({ cuenta, textoTotal }: { cuenta: CuentaMesa; textoTotal: string }) {
  const conConsumos = cuenta.consumos > 0
  const conBeneficios = cuenta.valorGratis > 0 || cuenta.descuento > 0 || cuenta.descuentoBar > 0
  return (
    <>
      {(conConsumos || conBeneficios) && (
        <div>
          <dt>{conConsumos ? 'Mesa' : 'Subtotal'}</dt>
          <dd>{formatearPesos(cuenta.subtotalMesa)}</dd>
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
      {conConsumos && (
        <div>
          <dt>Consumos</dt>
          <dd>{formatearPesos(cuenta.consumos)}</dd>
        </div>
      )}
      {cuenta.descuentoBar > 0 && (
        <div className="linea-descuento">
          <dt>
            Descuento en consumos {cuenta.plan?.nombre} ({cuenta.porcentajeBar}%)
          </dt>
          <dd>−{formatearPesos(cuenta.descuentoBar)}</dd>
        </div>
      )}
      <div className="resumen-total">
        <dt>{textoTotal}</dt>
        <dd>{formatearPesos(cuenta.total)}</dd>
      </div>
    </>
  )
}
