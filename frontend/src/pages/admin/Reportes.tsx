import { useState } from 'react'
import { NOMBRES_METODO, useCaja, useCajasCerradas } from '../../caja/caja'
import { Encabezado } from '../../components/Encabezado'
import { GraficaBarras } from '../../components/GraficaBarras'
import { SelectorPeriodo } from '../../components/SelectorPeriodo'
import { TotalesPeriodo } from '../../components/TotalesPeriodo'
import { useAhora } from '../../hooks/useAhora'
import { categoriaPago, reporte, TEXTO_ACTUAL, todasLasCajas, type Periodo } from '../../reportes/reportes'
import type { MetodoPago } from '../../types'
import { formatearFecha, formatearHora, formatearPesos } from '../../utils/formato'

const METODOS: MetodoPago[] = ['efectivo', 'transferencia', 'tarjeta']

function Desglose({ titulo, filas, total }: { titulo: string; filas: [string, number][]; total: number }) {
  return (
    <div className="tarjeta panel-bloque">
      <h2 className="titulo-bloque">{titulo}</h2>
      <ul className="desglose">
        {filas.map(([nombre, valor]) => {
          const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0
          return (
            <li key={nombre}>
              <div className="desglose-fila">
                <span>{nombre}</span>
                <strong>{formatearPesos(valor)}</strong>
              </div>
              <div className="desglose-barra" aria-hidden="true">
                <span style={{ width: `${porcentaje}%` }} />
              </div>
              <span className="texto-suave desglose-porcentaje">{porcentaje}% del total</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Reportes() {
  const caja = useCaja()
  const cerradas = useCajasCerradas()
  const ahora = useAhora()
  const [periodo, setPeriodo] = useState<Periodo>('diario')
  const { tramos, actual, pagos, egresos } = reporte(todasLasCajas(caja, cerradas), periodo, ahora)

  const porCategoria = ['Mesas', 'Membresías', 'Torneos', 'Otros'].map(
    (c) => [c, pagos.filter((p) => categoriaPago(p.concepto) === c).reduce((t, p) => t + p.monto, 0)] as [string, number],
  )
  const porMetodo = METODOS.map(
    (m) => [NOMBRES_METODO[m], pagos.filter((p) => p.metodo === m).reduce((t, p) => t + p.monto, 0)] as [string, number],
  )

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Reportes" subtitulo={`${TEXTO_ACTUAL[periodo]} · ${actual.detalle}`} />
        <SelectorPeriodo valor={periodo} onCambiar={setPeriodo} />
      </header>

      <TotalesPeriodo ingresos={actual.ingresos} egresos={actual.egresos} />

      <div className="tarjeta panel-bloque">
        <h2 className="titulo-bloque">Ingresos por {periodo === 'diario' ? 'día' : periodo === 'semanal' ? 'semana' : 'mes'}</h2>
        <GraficaBarras tramos={tramos} titulo="Ingresos por periodo" alta />
      </div>

      <div className="grid-reportes">
        <Desglose titulo="Ingresos por concepto" filas={porCategoria} total={actual.ingresos} />
        <Desglose titulo="Ingresos por método de pago" filas={porMetodo} total={actual.ingresos} />
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Egresos</h2>
          {egresos.length === 0 ? (
            <p className="texto-suave">Sin egresos en este periodo.</p>
          ) : (
            <ul className="movimientos">
              {egresos.toReversed().map((e) => (
                <li key={e.id}>
                  <span className="movimiento-texto">
                    <strong>{e.concepto}</strong>
                    <span>
                      {formatearFecha(e.fecha)} · {formatearHora(e.fecha)}
                    </span>
                  </span>
                  <strong className="texto-egreso">−{formatearPesos(e.monto)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
