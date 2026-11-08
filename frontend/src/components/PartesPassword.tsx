import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import { REGLAS_PASSWORD } from '../auth/validaciones'

export function BotonOjo({ visible, onCambiar }: { visible: boolean; onCambiar: () => void }) {
  return (
    <button
      type="button"
      className="campo-ojo"
      onClick={onCambiar}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {visible ? <Eye size={18} /> : <EyeOff size={18} />}
    </button>
  )
}

// Lista que se marca mientras se escribe la contraseña nueva. Son spans porque también va dentro de <label>.
export function ReglasPassword({ password }: { password: string }) {
  return (
    <span className="requisitos-password">
      {REGLAS_PASSWORD.map(({ texto, cumple }) => {
        const ok = cumple(password)
        return (
          <span key={texto} className={ok ? 'requisito requisito-ok' : 'requisito'}>
            {ok ? <Check size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
            {texto}
            <span className="sr-only">{ok ? ' (cumple)' : ' (falta)'}</span>
          </span>
        )
      })}
    </span>
  )
}
