import { User } from 'lucide-react'
import { filtrarNombre, LARGO_MAXIMO_NOMBRE, PARTES_NOMBRE, type Errores } from '../auth/validaciones'
import type { Usuario } from '../types'
import { CampoClaro } from './CampoClaro'
import { CampoTexto } from './CampoTexto'

type CamposNombreProps = {
  // "oscuro" para el registro (sobre la foto) y "claro" para los formularios del panel.
  variante: 'oscuro' | 'claro'
  errores: Errores
  // Para editar: las partes que ya tiene guardadas.
  usuario?: Usuario
  autoFocus?: boolean
}

const AUTOCOMPLETAR: Record<string, string> = {
  primer_nombre: 'given-name',
  segundo_nombre: 'additional-name',
  primer_apellido: 'family-name',
  segundo_apellido: 'off',
}

// Primer y segundo nombre, primer y segundo apellido. Solo dejan escribir letras.
export function CamposNombre({ variante, errores, usuario, autoFocus }: CamposNombreProps) {
  return (
    <div className={`fila-campos fila-campos-${variante}`}>
      {PARTES_NOMBRE.map(({ campo, etiqueta, obligatorio }, i) => {
        const comunes = {
          name: campo,
          defaultValue: usuario?.[campo] ?? '',
          maxLength: LARGO_MAXIMO_NOMBRE,
          onInput: filtrarNombre,
          autoComplete: AUTOCOMPLETAR[campo],
          required: obligatorio,
          autoFocus: autoFocus && i === 0,
          error: errores[campo],
        }
        return variante === 'oscuro' ? (
          <CampoTexto key={campo} etiqueta={obligatorio ? etiqueta : `${etiqueta} (opcional)`} icono={User} {...comunes} />
        ) : (
          <CampoClaro key={campo} etiqueta={obligatorio ? etiqueta : `${etiqueta} (opcional)`} {...comunes} />
        )
      })}
    </div>
  )
}
