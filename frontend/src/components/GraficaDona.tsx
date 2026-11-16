import { useState } from 'react'
import { formatearPesos } from '../utils/formato'

export type PorcionDona = { nombre: string; valor: number; color: string }

type GraficaDonaProps = {
  titulo: string
  porciones: PorcionDona[]
  // Texto bajo el total en el centro (ej. "Hoy").
  subtitulo?: string
}

const TAMANO = 200
const CENTRO = TAMANO / 2
const RADIO = 86
const GROSOR = 30

// Punto sobre el círculo; el ángulo 0 está arriba y crece en el sentido del reloj.
function punto(angulo: number, radio: number) {
  return [CENTRO + radio * Math.sin(angulo), CENTRO - radio * Math.cos(angulo)]
}

// Una porción del anillo, de `desde` a `hasta` (en radianes).
function arco(desde: number, hasta: number) {
  const externo = RADIO
  const interno = RADIO - GROSOR
  const grande = hasta - desde > Math.PI ? 1 : 0
  const [x1, y1] = punto(desde, externo)
  const [x2, y2] = punto(hasta, externo)
  const [x3, y3] = punto(hasta, interno)
  const [x4, y4] = punto(desde, interno)
  return `M${x1} ${y1} A${externo} ${externo} 0 ${grande} 1 ${x2} ${y2} L${x3} ${y3} A${interno} ${interno} 0 ${grande} 0 ${x4} ${y4} Z`
}

const porcentaje = (valor: number, total: number) => (total > 0 ? Math.round((valor * 100) / total) : 0)

// Dona de "de dónde vino la plata": el total en el centro, la leyenda con el valor y el % de cada parte
// (así nadie depende solo del color), y al pasar el mouse por una porción se resalta y se ve su detalle.
export function GraficaDona({ titulo, porciones, subtitulo }: GraficaDonaProps) {
  const [activa, setActiva] = useState<string | null>(null)
  const total = porciones.reduce((suma, p) => suma + p.valor, 0)
  const conValor = porciones.filter((p) => p.valor > 0)
  const resaltada = conValor.find((p) => p.nombre === activa) ?? null

  // Dónde empieza cada porción: la suma de las anteriores.
  const arcos = conValor.map((p, i) => {
    const antes = conValor.slice(0, i).reduce((suma, x) => suma + x.valor, 0)
    const desde = (antes / total) * 2 * Math.PI
    const hasta = ((antes + p.valor) / total) * 2 * Math.PI
    return { ...p, desde, hasta }
  })

  return (
    <figure className="dona">
      <div className="dona-grafica">
        <svg viewBox={`0 0 ${TAMANO} ${TAMANO}`} role="img" aria-label={`${titulo}: ${conValor.map((p) => `${p.nombre} ${porcentaje(p.valor, total)}%`).join(', ') || 'sin ingresos'}`}>
          {total === 0 ? (
            <circle cx={CENTRO} cy={CENTRO} r={RADIO - GROSOR / 2} fill="none" className="dona-vacia" strokeWidth={GROSOR} />
          ) : arcos.length === 1 ? (
            <circle
              cx={CENTRO}
              cy={CENTRO}
              r={RADIO - GROSOR / 2}
              fill="none"
              stroke={arcos[0].color}
              strokeWidth={GROSOR}
              onMouseEnter={() => setActiva(arcos[0].nombre)}
              onMouseLeave={() => setActiva(null)}
            />
          ) : (
            arcos.map((a) => (
              <path
                key={a.nombre}
                d={arco(a.desde, a.hasta)}
                fill={a.color}
                className={`dona-porcion ${activa && activa !== a.nombre ? 'dona-atenuada' : ''}`}
                onMouseEnter={() => setActiva(a.nombre)}
                onMouseLeave={() => setActiva(null)}
              />
            ))
          )}
        </svg>
        <div className="dona-centro" aria-hidden="true">
          {resaltada ? (
            <>
              <span>{resaltada.nombre}</span>
              <strong>{formatearPesos(resaltada.valor)}</strong>
              <span>{porcentaje(resaltada.valor, total)}% del total</span>
            </>
          ) : (
            <>
              <span>Total</span>
              <strong>{formatearPesos(total)}</strong>
              {subtitulo && <span>{subtitulo}</span>}
            </>
          )}
        </div>
      </div>
      <figcaption className="sr-only">{titulo}</figcaption>
      <ul className="dona-leyenda">
        {porciones.map((p) => (
          <li
            key={p.nombre}
            className={activa === p.nombre ? 'activa' : ''}
            onMouseEnter={() => p.valor > 0 && setActiva(p.nombre)}
            onMouseLeave={() => setActiva(null)}
          >
            <span className="dona-muestra" style={{ background: p.color }} aria-hidden="true" />
            <span className="dona-nombre">{p.nombre}</span>
            <strong>{formatearPesos(p.valor)}</strong>
            <span className="dona-porcentaje">{porcentaje(p.valor, total)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
