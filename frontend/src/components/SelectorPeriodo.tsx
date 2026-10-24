import { NOMBRES_PERIODO, type Periodo } from '../reportes/reportes'

const PERIODOS: Periodo[] = ['diario', 'semanal', 'mensual']

export function SelectorPeriodo({ valor, onCambiar }: { valor: Periodo; onCambiar: (p: Periodo) => void }) {
  return (
    <div className="selector-periodo" role="group" aria-label="Periodo del reporte">
      {PERIODOS.map((p) => (
        <button key={p} type="button" className={valor === p ? 'activo' : ''} aria-pressed={valor === p} onClick={() => onCambiar(p)}>
          {NOMBRES_PERIODO[p]}
        </button>
      ))}
    </div>
  )
}
