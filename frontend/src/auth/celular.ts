import type { FormEvent } from 'react'

// Países que se pueden escoger para el celular. La misma lista está en backend/app/schemas/celular.py
// (si cambia una, cambiar la otra). El celular se guarda en formato internacional: "+573001234567".

export type Pais = {
  codigo: string
  nombre: string
  indicativo: string
  // Dígitos que se escriben en el formulario (el número nacional del celular).
  digitos: number
  // Cómo es un celular válido de ese país.
  patron: RegExp
  // Lo que puede ir escrito a medias: un dígito que ya no puede llevar a un celular válido no se deja escribir.
  parcial: RegExp
  // Grupos con que se muestra el número: [3, 3, 4] → "300 123 4567".
  grupos: number[]
  // Lo que va entre el indicativo y el número al marcar a un celular (Argentina: +54 9 …).
  prefijoMovil?: string
}

export const PAISES: Pais[] = [
  { codigo: 'CO', nombre: 'Colombia', indicativo: '57', digitos: 10, patron: /^3\d{9}$/, parcial: /^(?:3\d{0,9})?$/, grupos: [3, 3, 4] },
  { codigo: 'AR', nombre: 'Argentina', indicativo: '54', digitos: 10, patron: /^[1-9]\d{9}$/, parcial: /^(?:[1-9]\d{0,9})?$/, grupos: [2, 4, 4], prefijoMovil: '9' },
  { codigo: 'BR', nombre: 'Brasil', indicativo: '55', digitos: 11, patron: /^[1-9]{2}9\d{8}$/, parcial: /^(?:[1-9](?:[1-9](?:9\d{0,8})?)?)?$/, grupos: [2, 5, 4] },
  { codigo: 'CL', nombre: 'Chile', indicativo: '56', digitos: 9, patron: /^9\d{8}$/, parcial: /^(?:9\d{0,8})?$/, grupos: [1, 4, 4] },
  { codigo: 'EC', nombre: 'Ecuador', indicativo: '593', digitos: 9, patron: /^9\d{8}$/, parcial: /^(?:9\d{0,8})?$/, grupos: [2, 3, 4] },
  { codigo: 'ES', nombre: 'España', indicativo: '34', digitos: 9, patron: /^[67]\d{8}$/, parcial: /^(?:[67]\d{0,8})?$/, grupos: [3, 3, 3] },
  { codigo: 'US', nombre: 'Estados Unidos', indicativo: '1', digitos: 10, patron: /^[2-9]\d{2}[2-9]\d{6}$/, parcial: /^(?:[2-9](?:\d(?:\d(?:[2-9]\d{0,6})?)?)?)?$/, grupos: [3, 3, 4] },
  { codigo: 'MX', nombre: 'México', indicativo: '52', digitos: 10, patron: /^[1-9]\d{9}$/, parcial: /^(?:[1-9]\d{0,9})?$/, grupos: [2, 4, 4] },
  { codigo: 'PA', nombre: 'Panamá', indicativo: '507', digitos: 8, patron: /^6\d{7}$/, parcial: /^(?:6\d{0,7})?$/, grupos: [4, 4] },
  { codigo: 'PE', nombre: 'Perú', indicativo: '51', digitos: 9, patron: /^9\d{8}$/, parcial: /^(?:9\d{0,8})?$/, grupos: [3, 3, 3] },
  { codigo: 'VE', nombre: 'Venezuela', indicativo: '58', digitos: 10, patron: /^4(?:1[246]|2[46])\d{7}$/, parcial: /^(?:4(?:(?:1[246]|2[46])\d{0,7}|[12])?)?$/, grupos: [3, 3, 4] },
]

export const PAIS_POR_DEFECTO = PAISES[0]

export function buscarPais(codigo: string | null | undefined) {
  return PAISES.find((pais) => pais.codigo === codigo) ?? PAIS_POR_DEFECTO
}

// 🇨🇴 a partir de "CO".
export function bandera(codigo: string) {
  return String.fromCodePoint(...[...codigo].map((letra) => 0x1f1e6 + letra.charCodeAt(0) - 65))
}

function soloDigitos(texto: string) {
  return texto.replace(/\D/g, '')
}

// "3001234567" → "300 123 4567", según los grupos del país (sirve también mientras se escribe).
export function agrupar(digitos: string, pais: Pais) {
  const partes: string[] = []
  let inicio = 0
  for (const largo of pais.grupos) {
    if (inicio >= digitos.length) break
    partes.push(digitos.slice(inicio, inicio + largo))
    inicio += largo
  }
  return partes.join(' ')
}

export function ejemplo(pais: Pais) {
  const muestra: Record<string, string> = {
    CO: '3001234567', AR: '1123456789', BR: '11912345678', CL: '912345678', EC: '991234567', ES: '612345678',
    US: '2015550123', MX: '5512345678', PA: '61234567', PE: '912345678', VE: '4121234567',
  }
  return agrupar(muestra[pais.codigo] ?? '', pais)
}

// Se queda con los dígitos que todavía pueden formar un celular válido del país: uno que no
// corresponde (un 5 al empezar un celular colombiano, uno de más) no se deja escribir.
export function dejarDigitosValidos(texto: string, pais: Pais) {
  let aceptados = ''
  for (const digito of soloDigitos(texto)) {
    if (pais.parcial.test(aceptados + digito)) aceptados += digito
  }
  return aceptados
}

// Mientras se escribe: solo los dígitos correctos, y agrupados.
export function filtrarCelular(e: FormEvent<HTMLInputElement>, pais: Pais) {
  const campo = e.currentTarget
  const formateado = agrupar(dejarDigitosValidos(campo.value, pais), pais)
  if (formateado !== campo.value) campo.value = formateado
}

export function validarCelular(numero: string, pais: Pais) {
  const digitos = soloDigitos(numero)
  if (!digitos) return 'El celular es obligatorio.'
  if (digitos.length !== pais.digitos) return `El celular de ${pais.nombre} debe tener ${pais.digitos} dígitos.`
  if (!pais.patron.test(digitos)) return `No es un celular válido de ${pais.nombre}.`
  return ''
}

// País + número escrito → "+573001234567", que es como lo guarda el backend.
export function aInternacional(numero: string, pais: Pais) {
  return `+${pais.indicativo}${pais.prefijoMovil ?? ''}${soloDigitos(numero)}`
}

// "+573001234567" → país y número escrito. Lo que no trae indicativo se toma como colombiano.
export function desdeInternacional(guardado: string | null | undefined): { pais: Pais; numero: string; reconocido: boolean } {
  const texto = (guardado ?? '').trim()
  const digitos = soloDigitos(texto)
  if (!texto.startsWith('+')) {
    const pais = PAIS_POR_DEFECTO
    return { pais, numero: agrupar(digitos.slice(0, pais.digitos), pais), reconocido: digitos.length === pais.digitos }
  }
  // Primero los indicativos más largos: "+593" es Ecuador aunque empiece como "+59…".
  const ordenados = [...PAISES].sort((a, b) => b.indicativo.length - a.indicativo.length)
  for (const pais of ordenados) {
    const inicio = pais.indicativo + (pais.prefijoMovil ?? '')
    if (digitos.startsWith(inicio)) {
      const numero = digitos.slice(inicio.length)
      return { pais, numero: agrupar(numero.slice(0, pais.digitos), pais), reconocido: numero.length === pais.digitos }
    }
  }
  return { pais: PAIS_POR_DEFECTO, numero: '', reconocido: false }
}

// Para mostrar en listas y fichas: "+57 300 123 4567". Lo que no se reconoce se muestra tal cual.
export function formatearCelular(guardado: string | null | undefined) {
  if (!guardado) return ''
  const { pais, numero, reconocido } = desdeInternacional(guardado)
  if (!reconocido) return guardado
  return `+${pais.indicativo} ${pais.prefijoMovil ? `${pais.prefijoMovil} ` : ''}${numero}`
}
