import type { CategoriaProducto } from '../types'
import { formatearPesos } from './formato'

// Tope de cualquier valor en pesos (pagos, egresos, base y conteo de caja). Es el mismo MONTO_MAXIMO
// del backend (backend/app/schemas/comun.py): si se cambia, cambiarlo en los dos lados.
export const MONTO_MAXIMO = 10_000_000

export type Limite = {
  min: number
  max: number
  // Cómo se muestran el mínimo y el máximo en el mensaje.
  pesos?: boolean
  unidad?: string
}

// Rangos realistas para un club de billar, según lo que de verdad cuesta cada cosa. Los que también
// valida el backend usan el mismo valor (backend/app/schemas/comun.py); tarifas y productos todavía
// viven solo en el navegador.
export const LIMITES = {
  tarifaHora: { min: 1_000, max: 50_000, pesos: true },
  ajusteTarifa: { min: -100, max: 100, unidad: '%' },
  precioPlan: { min: 10_000, max: 500_000, pesos: true },
  inscripcion: { min: 0, max: 500_000, pesos: true },
  porcentaje: { min: 0, max: 100, unidad: '%' },
  horasGratis: { min: 0, max: 100, unidad: ' h' },
  egreso: { min: 100, max: MONTO_MAXIMO, pesos: true },
  baseCaja: { min: 0, max: MONTO_MAXIMO, pesos: true },
} satisfies Record<string, Limite>

// Precio de un producto según su categoría: una gaseosa o unas papas no pueden costar $500.000.
export const LIMITES_PRODUCTO: Record<CategoriaProducto, Limite> = {
  bebida: { min: 500, max: 20_000, pesos: true },
  paquete: { min: 500, max: 15_000, pesos: true },
}

// Mensaje de error de un campo numérico, o null si es válido. Acepta el texto del input o un número
// (NaN cuando el campo quedó vacío).
export function errorNumero(valor: string | number, limite: Limite): string | null {
  const texto = typeof valor === 'number' ? (Number.isNaN(valor) ? '' : String(valor)) : valor.trim()
  if (texto === '') return 'Escribe un valor.'
  const numero = Number(texto)
  if (!Number.isFinite(numero)) return 'Escribe un número válido.'
  if (!Number.isInteger(numero)) return 'Debe ser un número entero, sin decimales.'
  if (numero < limite.min) return `No puede ser menor que ${mostrarLimite(limite.min, limite)}.`
  if (numero > limite.max) return `No puede ser mayor que ${mostrarLimite(limite.max, limite)}.`
  return null
}

function mostrarLimite(numero: number, limite: Limite) {
  return limite.pesos ? formatearPesos(numero) : `${numero}${limite.unidad ?? ''}`
}

// Por qué no se dejó escribir algo en un campo numérico (CampoNumero), o null si sí se podía.
export function motivoRechazo(texto: string, limite: Limite): string | null {
  if (aceptaEscritura(texto, limite)) return null
  if (/^-?\d+$/.test(texto)) {
    const numero = Number(texto)
    if (numero > limite.max) return `No puede ser mayor que ${mostrarLimite(limite.max, limite)}.`
    if (numero < limite.min) return `No puede ser menor que ${mostrarLimite(limite.min, limite)}.`
  }
  return limite.min < 0 ? 'Solo números enteros.' : 'Solo números enteros, sin signos ni decimales.'
}

// Valor de un input numérico controlado: NaN si quedó vacío, para que errorNumero lo marque.
export function leerNumero(texto: string) {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

// Lo que va escrito en un campo numérico todavía puede quedar dentro del límite: solo dígitos (y el
// signo menos si el límite admite negativos), sin ceros de más a la izquierda y sin pasarse del
// máximo. Lo que no cumple no se deja escribir. Quedarse por debajo del mínimo sí se permite mientras
// se escribe (para llegar a 1.000 se pasa por 1): eso lo avisa errorNumero.
export function aceptaEscritura(texto: string, limite: Limite) {
  if (texto === '') return true
  if (texto === '-') return limite.min < 0
  if (!/^-?(?:0|[1-9]\d*)$/.test(texto)) return false
  const numero = Number(texto)
  return numero <= limite.max && (numero >= 0 || numero >= limite.min)
}
