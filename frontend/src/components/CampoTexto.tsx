import { useId, useState, type ComponentProps } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

type CampoTextoProps = ComponentProps<'input'> & {
  etiqueta: string
  icono: LucideIcon
}

export function CampoTexto({ etiqueta, icono: Icono, type = 'text', ...props }: CampoTextoProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const esPassword = type === 'password'

  return (
    <div className="campo">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <Icono className="campo-icono" size={18} aria-hidden="true" />
      <input id={id} type={esPassword && visible ? 'text' : type} placeholder={etiqueta} {...props} />
      {esPassword && (
        <button
          type="button"
          className="campo-ojo"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  )
}
