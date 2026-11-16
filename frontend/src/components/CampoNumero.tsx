import { useId, useState, type ComponentProps } from 'react'
import { motivoRechazo, type Limite } from '../utils/montos'

type CampoNumeroProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  // Lo que tiene el formulario: el texto escrito, o un número (NaN si quedó vacío).
  valor: string | number
  limite: Limite
  onValor: (texto: string) => void
}

function comoTexto(valor: string | number) {
  return typeof valor === 'number' ? (Number.isNaN(valor) ? '' : String(valor)) : valor
}

// Campo de número entero que no deja escribir lo que se sale del límite: letras, decimales o una
// cifra que ya pasa del máximo. Cuando algo no se deja escribir, dice por qué ("No puede ser mayor
// que $500.000.") hasta la siguiente tecla que sí sirva.
export function CampoNumero({ valor, limite, onValor, ...props }: CampoNumeroProps) {
  const idAviso = useId()
  const [aviso, setAviso] = useState<string | null>(null)
  const externo = comoTexto(valor)
  // Lo escrito se guarda aquí para no perder un "-" suelto (el formulario lo ve como vacío).
  const [texto, setTexto] = useState(externo)
  const [anterior, setAnterior] = useState(externo)
  if (externo !== anterior) {
    setAnterior(externo)
    if (externo !== (texto === '-' ? '' : texto)) setTexto(externo)
  }

  return (
    <>
      <input
        type="text"
        inputMode={limite.min < 0 ? 'text' : 'numeric'}
        autoComplete="off"
        value={texto}
        onChange={(e) => {
          const nuevo = e.target.value.trim()
          const motivo = motivoRechazo(nuevo, limite)
          setAviso(motivo)
          if (motivo) return
          setTexto(nuevo)
          onValor(nuevo === '-' ? '' : nuevo)
        }}
        onBlur={() => setAviso(null)}
        {...props}
        aria-invalid={aviso ? true : props['aria-invalid']}
        aria-describedby={aviso ? idAviso : props['aria-describedby']}
      />
      {aviso && (
        <span id={idAviso} role="alert" className="campo-error">
          {aviso}
        </span>
      )}
    </>
  )
}
