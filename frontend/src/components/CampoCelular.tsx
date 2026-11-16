import { useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { agrupar, bandera, buscarPais, dejarDigitosValidos, desdeInternacional, ejemplo, filtrarCelular, PAISES } from '../auth/celular'

type CampoCelularProps = {
  // "oscuro" para el login/registro (sobre la foto) y "claro" para los formularios del panel.
  variante: 'oscuro' | 'claro'
  etiqueta?: string
  // Lo que ya está guardado ("+573001234567"), para editar.
  valorInicial?: string | null
  error?: string
  autoFocus?: boolean
}

// Celular con selector de país: el formulario envía "pais" (CO, MX…) y "telefono" (el número escrito).
export function CampoCelular({ variante, etiqueta = 'Celular', valorInicial, error, autoFocus }: CampoCelularProps) {
  const id = useId()
  const idDetalle = useId()
  const inicial = desdeInternacional(valorInicial)
  const [pais, setPais] = useState(inicial.pais)
  const campo = useRef<HTMLInputElement>(null)
  const muestra = ejemplo(pais)

  function cambiarPais(codigo: string) {
    const nuevo = buscarPais(codigo)
    setPais(nuevo)
    // El número ya escrito se queda con lo que sirva para el país nuevo y se agrupa.
    if (campo.current) campo.current.value = agrupar(dejarDigitosValidos(campo.current.value, nuevo), nuevo)
  }

  return (
    <div className={`celular celular-${variante}`}>
      <label htmlFor={id} className={variante === 'claro' ? 'celular-etiqueta' : 'sr-only'}>
        {etiqueta}
      </label>
      <div className="celular-fila">
        <div className="celular-pais">
          <span aria-hidden="true">
            {bandera(pais.codigo)} +{pais.indicativo}
          </span>
          <ChevronDown size={14} aria-hidden="true" />
          <select name="pais" aria-label="País del celular" value={pais.codigo} onChange={(e) => cambiarPais(e.target.value)}>
            {PAISES.map((opcion) => (
              <option key={opcion.codigo} value={opcion.codigo}>
                {bandera(opcion.codigo)} {opcion.nombre} (+{opcion.indicativo})
              </option>
            ))}
          </select>
        </div>
        <input
          ref={campo}
          id={id}
          name="telefono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={variante === 'oscuro' ? `${etiqueta} (${muestra})` : muestra}
          defaultValue={inicial.numero}
          onInput={(e) => filtrarCelular(e, pais)}
          required
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idDetalle : undefined}
        />
      </div>
      {error && (
        <span id={idDetalle} className="campo-error">
          {error}
        </span>
      )}
    </div>
  )
}
