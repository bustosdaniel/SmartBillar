import { useState } from 'react'
import { Check, Copy, Smartphone } from 'lucide-react'
import { CUENTA_TRANSFERENCIAS, numeroLegible } from '../caja/transferencia'
import { formatearPesos } from '../utils/formato'

type DatosTransferenciaProps = {
  // El valor exacto a transferir, si ya se sabe.
  monto?: number
  // Texto debajo (qué hacer después de transferir).
  nota?: string
}

function Copiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch {
      // Sin permiso para el portapapeles: el número se ve en pantalla igual.
    }
  }
  return (
    <button type="button" className="boton-icono boton-icono-claro" aria-label={`Copiar ${etiqueta}`} onClick={copiar}>
      {copiado ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}

// A dónde enviar la plata por Nequi, Daviplata o Bre-B.
export function DatosTransferencia({ monto, nota }: DatosTransferenciaProps) {
  const { numero, llave, plataformas } = CUENTA_TRANSFERENCIAS
  return (
    <div className="datos-transferencia">
      <p className="datos-transferencia-titulo">
        <Smartphone size={16} aria-hidden="true" /> Transfiere{monto !== undefined && <strong> {formatearPesos(monto)}</strong>} a:
      </p>
      <dl>
        <div>
          <dt>{plataformas}</dt>
          <dd>
            <strong>{numeroLegible(numero)}</strong>
            <Copiar texto={numero} etiqueta="el número" />
          </dd>
        </div>
        <div>
          <dt>Llave Bre-B (cualquier banco)</dt>
          <dd>
            <strong>{llave}</strong>
            <Copiar texto={llave} etiqueta="la llave" />
          </dd>
        </div>
      </dl>
      {nota && <p className="nota">{nota}</p>}
    </div>
  )
}
