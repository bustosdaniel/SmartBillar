import { useState } from 'react'
import type { Tramo } from '../reportes/reportes'
import { formatearPesos } from '../utils/formato'

const compacto = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

// Eje con pasos "redondos" (1, 2, 2.5 o 5 por potencia de 10) y como mucho 4 divisiones.
function escala(maximo: number) {
  if (maximo <= 0) return { tope: 100000, paso: 25000 }
  const bruto = maximo / 4
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= bruto) ?? bruto
  return { tope: Math.ceil(maximo / paso) * paso, paso }
}

type GraficaBarrasProps = {
  tramos: Tramo[]
  titulo: string
  alta?: boolean
  compacta?: boolean
}

// Columnas de ingresos por tramo. Una sola serie: el título dice qué se grafica, sin leyenda.
export function GraficaBarras({ tramos, titulo, alta = false, compacta = false }: GraficaBarrasProps) {
  const [activo, setActivo] = useState<number | null>(null)
  const { tope, paso } = escala(Math.max(...tramos.map((t) => t.ingresos)))
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso)
  const ultimo = tramos.length - 1

  return (
    <figure className={`grafica ${alta ? 'grafica-alta' : ''} ${compacta ? 'grafica-compacta' : ''}`}>
      <div className="grafica-cuerpo" aria-hidden="true">
        <div className="grafica-eje">
          {marcas.toReversed().map((m) => (
            <span key={m}>{compacto.format(m)}</span>
          ))}
        </div>
        <div className="grafica-area" onMouseLeave={() => setActivo(null)}>
          {marcas.map((m) => (
            <span key={m} className="grafica-linea" style={{ bottom: `${(m / tope) * 100}%` }} />
          ))}
          {tramos.map((t, i) => (
            <div
              key={t.inicio}
              className={`grafica-columna ${activo === i ? 'activa' : ''}`}
              onMouseEnter={() => setActivo(i)}
            >
              {i === ultimo && t.ingresos > 0 && activo === null && (
                <span className="grafica-valor" style={{ bottom: `${(t.ingresos / tope) * 100}%` }}>
                  {compacto.format(t.ingresos)}
                </span>
              )}
              <span className="grafica-barra" style={{ height: `${(t.ingresos / tope) * 100}%` }} />
              {activo === i && (
                <div className="grafica-tooltip" style={{ bottom: `${(t.ingresos / tope) * 100}%` }}>
                  <strong>{t.detalle}</strong>
                  <span>Ingresos {formatearPesos(t.ingresos)}</span>
                  <span>Egresos {formatearPesos(t.egresos)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grafica-etiquetas" aria-hidden="true">
        {tramos.map((t) => (
          <span key={t.inicio}>{t.etiqueta}</span>
        ))}
      </div>
      {/* Vista de tabla para lectores de pantalla y teclado. */}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Ingresos</th>
            <th>Egresos</th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((t) => (
            <tr key={t.inicio}>
              <td>{t.detalle}</td>
              <td>{formatearPesos(t.ingresos)}</td>
              <td>{formatearPesos(t.egresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
