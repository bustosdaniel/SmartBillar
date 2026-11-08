import { useId, useState, type ComponentProps } from 'react'
import { BotonOjo, ReglasPassword } from './PartesPassword'

type CampoClaroProps = ComponentProps<'input'> & {
  etiqueta: string
  error?: string
  ayuda?: string
  // Muestra la lista de requisitos de una contraseña nueva.
  conReglas?: boolean
}

// Campo con etiqueta visible para los formularios claros (perfil y diálogos).
export function CampoClaro({ etiqueta, error, ayuda, conReglas, type = 'text', onChange, ...props }: CampoClaroProps) {
  const idDetalle = useId()
  const [visible, setVisible] = useState(false)
  const [escrito, setEscrito] = useState('')
  const esPassword = type === 'password'
  const detalle = error || ayuda

  return (
    <label>
      {etiqueta}
      <span className="campo-claro">
        <input
          type={esPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={detalle ? idDetalle : undefined}
          onChange={(e) => {
            setEscrito(e.target.value)
            onChange?.(e)
          }}
          {...props}
        />
        {esPassword && <BotonOjo visible={visible} onCambiar={() => setVisible((v) => !v)} />}
      </span>
      {detalle && (
        <span id={idDetalle} className={error ? 'campo-error' : 'campo-ayuda'}>
          {detalle}
        </span>
      )}
      {conReglas && <ReglasPassword password={escrito} />}
    </label>
  )
}
