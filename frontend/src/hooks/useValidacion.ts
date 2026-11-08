import { useRef, useState, type FocusEvent, type FormEvent } from 'react'
import type { Errores } from '../auth/validaciones'

// Valida un formulario en vivo: un campo muestra su error al salir de él y se revisa de nuevo con
// cada tecla. Un campo que se deja vacío no reclama hasta que se intenta enviar.
export function useValidacion(validar: (datos: FormData) => Errores) {
  const [errores, setErrores] = useState<Errores>({})
  const tocados = useRef(new Set<string>())

  function revisar(formulario: HTMLFormElement) {
    const encontrados = Object.entries(validar(new FormData(formulario)))
    setErrores(Object.fromEntries(encontrados.filter(([campo]) => tocados.current.has(campo))))
  }

  const eventos = {
    onBlur(e: FocusEvent<HTMLFormElement>) {
      const { name, value } = e.target as unknown as HTMLInputElement
      if (!name || !value) return
      tocados.current.add(name)
      revisar(e.currentTarget)
    },
    onChange(e: FormEvent<HTMLFormElement>) {
      revisar(e.currentTarget)
    },
  }

  // Al enviar: muestra todos los errores y dice si el formulario se puede enviar.
  function validarTodo(formulario: HTMLFormElement) {
    const encontrados = validar(new FormData(formulario))
    Object.keys(encontrados).forEach((campo) => tocados.current.add(campo))
    setErrores(encontrados)
    return Object.keys(encontrados).length === 0
  }

  function reiniciar() {
    tocados.current.clear()
    setErrores({})
  }

  return { errores, eventos, validarTodo, reiniciar }
}
