import { useState } from 'react'
import { Link } from 'react-router'
import { useCaja, useCajasCerradas } from '../../../caja/caja'
import { GraficaBarras } from '../../../components/GraficaBarras'
import { SelectorPeriodo } from '../../../components/SelectorPeriodo'
import { TotalesPeriodo } from '../../../components/TotalesPeriodo'
import { reporte, todasLasCajas, type Periodo } from '../../../reportes/reportes'

export function ResumenCaja({ ahora }: { ahora: number }) {
  const caja = useCaja()
  const cerradas = useCajasCerradas()
  const [periodo, setPeriodo] = useState<Periodo>('diario')
  const { tramos, actual } = reporte(todasLasCajas(caja, cerradas), periodo, ahora)

  return (
    <section className="tarjeta panel-bloque resumen-caja">
      <header className="panel-bloque-cabecera">
        <h2>Caja y reportes</h2>
        <SelectorPeriodo valor={periodo} onCambiar={setPeriodo} />
      </header>
      <TotalesPeriodo ingresos={actual.ingresos} egresos={actual.egresos} />
      <GraficaBarras tramos={tramos} titulo="Ingresos por periodo" compacta />
      <Link to="/admin/reportes" className="enlace-reporte">
        Ver reporte completo →
      </Link>
    </section>
  )
}
