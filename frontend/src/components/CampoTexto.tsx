import { useId, useState, type ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BotonOjo, ReglasPassword } from './PartesPassword'

type CampoTextoProps = ComponentProps<'input'> & {
  etiqueta: string
  icono: LucideIcon
  error?: string
  ayuda?: string
  // Muestra la lista de requisitos de una contraseña nueva.
  conReglas?: boolean
}

export function CampoTexto({ etiqueta, icono: Icono, type = 'text', error, ayuda, conReglas, onChange, ...props }: CampoTextoProps) {
  const id = useId()
  const idDetalle = useId()
  const [visible, setVisible] = useState(false)
  const [escrito, setEscrito] = useState('')
  const esPassword = type === 'password'
  const detalle = error || ayuda

  return (
    <div>
      <div className="campo">
        <label htmlFor={id} className="sr-only">
          {etiqueta}
        </label>
        <Icono className="campo-icono" size={18} aria-hidden="true" />
        <input
          id={id}
          type={esPassword && visible ? 'text' : type}
          placeholder={etiqueta}
          aria-invalid={error ? true : undefined}
          aria-describedby={detalle ? idDetalle : undefined}
          onChange={(e) => {
            setEscrito(e.target.value)
            onChange?.(e)
          }}
          {...props}
        />
        {esPassword && <BotonOjo visible={visible} onCambiar={() => setVisible((v) => !v)} />}
      </div>
      {detalle && (
        <span id={idDetalle} className={error ? 'campo-error' : 'campo-ayuda'}>
          {detalle}
        </span>
      )}
      {conReglas && <ReglasPassword password={escrito} />}
    </div>
  )
}
