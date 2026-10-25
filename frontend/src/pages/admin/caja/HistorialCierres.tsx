import { efectivoEsperado, textoDiferencia, useCajasCerradas } from '../../../caja/caja'
import { formatearFecha, formatearHora, formatearPesos } from '../../../utils/formato'

export function HistorialCierres() {
  const cierres = useCajasCerradas().toReversed().slice(0, 6)
  if (cierres.length === 0) return null

  return (
    <div className="tarjeta panel-bloque">
      <h2 className="titulo-bloque">Últimos cierres</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Turno</th>
              <th className="numero">Esperado</th>
              <th className="numero">Contado</th>
              <th>Arqueo</th>
            </tr>
          </thead>
          <tbody>
            {cierres.map((c) => {
              const esperado = efectivoEsperado(c)
              const diferencia = c.contado == null ? null : c.contado - esperado
              return (
                <tr key={c.apertura}>
                  <td>
                    {formatearFecha(c.apertura)}
                    <span className="texto-suave">
                      {' '}
                      · {formatearHora(c.apertura)} – {formatearHora(c.cierre)}
                    </span>
                  </td>
                  <td className="numero">{formatearPesos(esperado)}</td>
                  <td className="numero">{c.contado == null ? '—' : formatearPesos(c.contado)}</td>
                  <td>
                    {diferencia === null ? (
                      <span className="texto-suave">Sin arqueo</span>
                    ) : (
                      <span
                        className={`estado ${diferencia === 0 ? 'membresia-activa' : diferencia > 0 ? 'estado-por-cobrar' : 'membresia-vencida'}`}
                        title={c.nota ?? undefined}
                      >
                        {textoDiferencia(diferencia)}
                      </span>
                    )}
                    {c.nota && <span className="texto-suave nota-cierre">{c.nota}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
