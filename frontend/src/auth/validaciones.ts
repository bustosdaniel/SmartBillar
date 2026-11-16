import type { FormEvent } from 'react'
import { aInternacional, buscarPais, validarCelular } from './celular'

// Reglas de los formularios de cuenta. Las mismas están en backend/app/schemas/usuarios.py.

export type Errores = Record<string, string>

const PATRON_NOMBRE = /^\p{L}+(?:[ '.-]+\p{L}+)*$/u
const PATRON_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,6}$/
// bcrypt no admite contraseñas de más de 72 bytes.
const BYTES_MAXIMOS_PASSWORD = 72

export const LARGO_MAXIMO_EMAIL = 160
export const LARGO_MAXIMO_NOMBRE = 25
const LARGO_MINIMO_NOMBRE = 2

// El nombre va en partes; el segundo nombre es opcional.
export const PARTES_NOMBRE = [
  { campo: 'primer_nombre', etiqueta: 'Primer nombre', obligatorio: true },
  { campo: 'segundo_nombre', etiqueta: 'Segundo nombre', obligatorio: false },
  { campo: 'primer_apellido', etiqueta: 'Primer apellido', obligatorio: true },
  { campo: 'segundo_apellido', etiqueta: 'Segundo apellido', obligatorio: true },
] as const

export type CampoNombre = (typeof PARTES_NOMBRE)[number]['campo']

export const REGLAS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres', cumple: (password: string) => password.length >= 8 },
  { texto: 'Una mayúscula', cumple: (password: string) => /\p{Lu}/u.test(password) },
  { texto: 'Una minúscula', cumple: (password: string) => /\p{Ll}/u.test(password) },
  { texto: 'Un número', cumple: (password: string) => /[0-9]/.test(password) },
  { texto: 'Un carácter especial', cumple: (password: string) => /[^\p{L}\p{N}\s]/u.test(password) },
]

// Si lo escrito hasta ahora todavía puede terminar en un correo válido. Después de ".com" solo puede
// ir el país (".com.co") y nada más.
function correoAMedias(texto: string) {
  if (texto.length > LARGO_MAXIMO_EMAIL || texto.includes('..')) return false
  const [usuario, dominio, ...sobra] = texto.split('@')
  if (sobra.length > 0) return false
  if (!/^[A-Za-z0-9._%+-]*$/.test(usuario)) return false
  if (dominio === undefined) return true
  if (!usuario || usuario.endsWith('.') || !/^[A-Za-z0-9.-]*$/.test(dominio) || dominio.startsWith('.')) return false
  const etiquetas = dominio.toLowerCase().split('.')
  for (let i = 1; i < etiquetas.length; i++) {
    const etiqueta = etiquetas[i]
    // ".comx": ya no puede ser ".com".
    if (etiqueta.startsWith('com') && etiqueta !== 'com') return false
    if (etiqueta === 'com') {
      const despues = etiquetas.slice(i + 1)
      return despues.length === 0 || (despues.length === 1 && /^[a-z]{0,2}$/.test(despues[0]))
    }
  }
  return true
}

// Se queda con lo que todavía puede formar un correo: un carácter que no va (un espacio, una
// segunda @, algo después de ".com") no se deja escribir.
export function dejarCorreoValido(texto: string) {
  let aceptado = ''
  for (const caracter of texto) {
    if (correoAMedias(aceptado + caracter)) aceptado += caracter
  }
  return aceptado
}

export function filtrarEmail(e: FormEvent<HTMLInputElement>) {
  const campo = e.currentTarget
  const filtrado = dejarCorreoValido(campo.value)
  if (filtrado !== campo.value) campo.value = filtrado
}

// En el nombre solo se pueden escribir letras, espacios y los separadores de un nombre (' . -).
export function filtrarNombre(e: FormEvent<HTMLInputElement>) {
  const campo = e.currentTarget
  const filtrado = campo.value.replace(/[^\p{L}\s'.-]/gu, '').slice(0, LARGO_MAXIMO_NOMBRE)
  if (filtrado !== campo.value) campo.value = filtrado
}

function validarParteNombre(valor: string, etiqueta: string, obligatorio: boolean) {
  if (!valor) return obligatorio ? `El ${etiqueta.toLowerCase()} es obligatorio.` : ''
  if (valor.length < LARGO_MINIMO_NOMBRE) return `El ${etiqueta.toLowerCase()} debe tener al menos ${LARGO_MINIMO_NOMBRE} letras.`
  if (valor.length > LARGO_MAXIMO_NOMBRE) return `El ${etiqueta.toLowerCase()} no puede tener más de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  if (!PATRON_NOMBRE.test(valor)) return `El ${etiqueta.toLowerCase()} solo puede tener letras.`
  return ''
}

function correoValido(email: string) {
  if (email.length > LARGO_MAXIMO_EMAIL || !PATRON_EMAIL.test(email) || email.includes('..')) return false
  const etiquetas = email.split('@')[1].toLowerCase().split('.')
  const com = etiquetas.indexOf('com', 1)
  if (com === -1) return true
  const despues = etiquetas.slice(com + 1)
  return despues.length === 0 || (despues.length === 1 && despues[0].length === 2)
}

function validarEmail(email: string) {
  if (!email) return 'El correo es obligatorio.'
  return correoValido(email) ? '' : 'El correo no es válido.'
}

function validarPasswordNueva(password: string, nombreCampo = 'La contraseña') {
  if (!password) return `${nombreCampo} es obligatoria.`
  if (new TextEncoder().encode(password).length > BYTES_MAXIMOS_PASSWORD) {
    return `${nombreCampo} no puede tener más de ${BYTES_MAXIMOS_PASSWORD} caracteres.`
  }
  if (!REGLAS_PASSWORD.every((regla) => regla.cumple(password))) return `${nombreCampo} no cumple los requisitos.`
  return ''
}

function validarConfirmacion(password: string, confirmar: string) {
  if (!confirmar) return 'Confirma la contraseña.'
  return password === confirmar ? '' : 'Las contraseñas no coinciden.'
}

function soloConError(campos: Errores): Errores {
  return Object.fromEntries(Object.entries(campos).filter(([, mensaje]) => mensaje))
}

function valor(datos: FormData, campo: string) {
  return String(datos.get(campo) ?? '')
}

// El celular sale en formato internacional ("+573001234567"), como lo guarda el backend.
export function leerDatosPersonales(datos: FormData) {
  const partes = Object.fromEntries(
    PARTES_NOMBRE.map(({ campo }) => [campo, valor(datos, campo).split(/\s+/).filter(Boolean).join(' ')]),
  ) as Record<CampoNombre, string>
  return {
    ...partes,
    email: valor(datos, 'email').trim(),
    telefono: aInternacional(valor(datos, 'telefono'), buscarPais(valor(datos, 'pais'))),
  }
}

// El login no exige las reglas de contraseña nueva: hay cuentas con la contraseña temporal.
export function validarLogin(datos: FormData): Errores {
  return soloConError({
    email: validarEmail(valor(datos, 'email').trim()),
    password: valor(datos, 'password') ? '' : 'La contraseña es obligatoria.',
  })
}

export function validarDatosPersonales(datos: FormData): Errores {
  const leidos = leerDatosPersonales(datos)
  return soloConError({
    ...Object.fromEntries(
      PARTES_NOMBRE.map(({ campo, etiqueta, obligatorio }) => [campo, validarParteNombre(leidos[campo], etiqueta, obligatorio)]),
    ),
    email: validarEmail(leidos.email),
    telefono: validarCelular(valor(datos, 'telefono'), buscarPais(valor(datos, 'pais'))),
  })
}

export function validarRegistro(datos: FormData): Errores {
  const password = valor(datos, 'password')
  return {
    ...validarDatosPersonales(datos),
    ...soloConError({
      password: validarPasswordNueva(password),
      confirmar: validarConfirmacion(password, valor(datos, 'confirmar')),
    }),
  }
}

export function validarEmailRecuperar(email: string) {
  return validarEmail(email)
}

// Contraseña nueva desde el enlace del correo de recuperación.
export function validarRestablecer(datos: FormData): Errores {
  const nueva = valor(datos, 'nueva')
  return soloConError({
    nueva: validarPasswordNueva(nueva, 'La contraseña nueva'),
    confirmar: validarConfirmacion(nueva, valor(datos, 'confirmar')),
  })
}

export function validarCambioPassword(datos: FormData): Errores {
  const actual = valor(datos, 'actual')
  const nueva = valor(datos, 'nueva')
  return soloConError({
    actual: actual ? '' : 'La contraseña actual es obligatoria.',
    nueva: actual && nueva === actual ? 'La contraseña nueva debe ser distinta de la actual.' : validarPasswordNueva(nueva, 'La contraseña nueva'),
    confirmar: validarConfirmacion(nueva, valor(datos, 'confirmar')),
  })
}
