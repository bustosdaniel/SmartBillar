import type { FormEvent } from 'react'

// Reglas de los formularios de cuenta. Las mismas están en backend/app/schemas/usuarios.py.

export type Errores = Record<string, string>

const PATRON_NOMBRE = /^\p{L}+(?:[ '.-]+\p{L}+)*$/u
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Celular colombiano: 10 dígitos que empiezan por 3, con o sin indicativo 57.
const PATRON_CELULAR = /^(?:\+?57)?3[0-9]{9}$/
const LARGO_MAXIMO_EMAIL = 160
const LARGO_MAXIMO_NOMBRE = 120
// bcrypt no admite contraseñas de más de 72 bytes.
const BYTES_MAXIMOS_PASSWORD = 72

// El más largo que se acepta escrito con separadores: "+57 300 123 4567".
export const LARGO_MAXIMO_CELULAR = 16
export const AYUDA_CELULAR = '10 dígitos, empieza por 3.'

export const REGLAS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres', cumple: (password: string) => password.length >= 8 },
  { texto: 'Una mayúscula', cumple: (password: string) => /\p{Lu}/u.test(password) },
  { texto: 'Una minúscula', cumple: (password: string) => /\p{Ll}/u.test(password) },
  { texto: 'Un número', cumple: (password: string) => /[0-9]/.test(password) },
]

// En el celular no se pueden escribir letras ni símbolos que nunca serían válidos.
export function filtrarCelular(e: FormEvent<HTMLInputElement>) {
  const campo = e.currentTarget
  const filtrado = campo.value.replace(/[^0-9+\s-]/g, '')
  if (filtrado !== campo.value) campo.value = filtrado
}

function validarNombre(nombre: string) {
  if (!nombre) return 'El nombre es obligatorio.'
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.'
  if (nombre.length > LARGO_MAXIMO_NOMBRE) return `El nombre no puede tener más de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  if (!PATRON_NOMBRE.test(nombre)) return 'El nombre solo puede tener letras y espacios.'
  return ''
}

function validarEmail(email: string) {
  if (!email) return 'El correo es obligatorio.'
  if (email.length > LARGO_MAXIMO_EMAIL || !PATRON_EMAIL.test(email)) return 'El correo no es válido.'
  return ''
}

function validarCelular(telefono: string) {
  if (!telefono) return 'El celular es obligatorio.'
  if (!PATRON_CELULAR.test(telefono.replace(/[\s-]/g, ''))) return 'El celular debe tener 10 dígitos y empezar por 3.'
  return ''
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

export function leerDatosPersonales(datos: FormData) {
  return {
    nombre: valor(datos, 'nombre').trim(),
    email: valor(datos, 'email').trim(),
    telefono: valor(datos, 'telefono').trim(),
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
  const { nombre, email, telefono } = leerDatosPersonales(datos)
  return soloConError({
    nombre: validarNombre(nombre),
    email: validarEmail(email),
    telefono: validarCelular(telefono),
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

export function validarCambioPassword(datos: FormData): Errores {
  const actual = valor(datos, 'actual')
  const nueva = valor(datos, 'nueva')
  return soloConError({
    actual: actual ? '' : 'La contraseña actual es obligatoria.',
    nueva: actual && nueva === actual ? 'La contraseña nueva debe ser distinta de la actual.' : validarPasswordNueva(nueva, 'La contraseña nueva'),
    confirmar: validarConfirmacion(nueva, valor(datos, 'confirmar')),
  })
}
