import type { Cargo, Usuario } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'
import { usuariosMock } from './mockUsers'

export type UsuarioConPassword = Usuario & { password: string }

// Contraseña temporal de las cuentas que crea el admin (el cliente la cambia con "¿Olvidaste tu contraseña?").
export const PASSWORD_TEMPORAL = '123456'

export const NOMBRES_CARGO: Record<Cargo, string> = {
  administrador: 'Administrador',
  cajero: 'Cajero / Operador',
}

export type DatosPerfil = Pick<Usuario, 'nombre' | 'email'> & { telefono: string; cedula: string }

const registrados = crearStoreLocal<UsuarioConPassword[]>('billar.registrados', [])
const cargos = crearStoreLocal<Partial<Record<number, Cargo>>>('billar.cargos', {})
// Cambios hechos desde el perfil. Así también se pueden editar los usuarios de prueba, que son fijos.
const cambios = crearStoreLocal<Partial<Record<number, Partial<UsuarioConPassword>>>>('billar.perfiles', {})

export const leerRegistrados = registrados.obtener
export const useCargos = cargos.useValor

function conCambios(lista: UsuarioConPassword[], todos: Partial<Record<number, Partial<UsuarioConPassword>>>) {
  return lista.map((u) => ({ ...u, ...todos[u.id] }))
}

export function todosLosUsuarios(): UsuarioConPassword[] {
  return conCambios([...usuariosMock, ...registrados.obtener()], cambios.obtener())
}

export function useUsuarios(): Usuario[] {
  const lista = registrados.useValor()
  const todos = cambios.useValor()
  return conCambios([...usuariosMock, ...lista], todos).map(sinPassword)
}

export function sinPassword({ password: _omit, ...usuario }: UsuarioConPassword): Usuario {
  return usuario
}

export function listarClientes(): Usuario[] {
  return todosLosUsuarios()
    .filter((u) => u.rol === 'cliente')
    .map(sinPassword)
}

// Solo los dígitos: "1.098.765.432" y "1098765432" son la misma cédula.
export function normalizarCedula(cedula: string) {
  return cedula.replace(/\D/g, '')
}

export function buscarPorCedula(cedula: string): Usuario | null {
  const buscada = normalizarCedula(cedula)
  if (!buscada) return null
  const cliente = listarClientes().find((u) => normalizarCedula(u.cedula ?? '') === buscada)
  return cliente ?? null
}

export function cedulaEnUso(cedula: string, exceptoId?: number) {
  const buscada = normalizarCedula(cedula)
  return !!buscada && todosLosUsuarios().some((u) => u.id !== exceptoId && normalizarCedula(u.cedula ?? '') === buscada)
}

export function emailEnUso(email: string, exceptoId?: number) {
  return todosLosUsuarios().some((u) => u.id !== exceptoId && u.email.toLowerCase() === email.toLowerCase())
}

// Devuelve un mensaje de error, o null si se guardó.
export function actualizarDatos(usuarioId: number, datos: DatosPerfil): string | null {
  if (!datos.nombre.trim()) return 'El nombre no puede quedar vacío.'
  if (emailEnUso(datos.email, usuarioId)) return 'Ya existe otra cuenta con ese correo.'
  if (cedulaEnUso(datos.cedula, usuarioId)) return 'Ya existe otra cuenta con esa cédula.'
  cambios.guardar({ ...cambios.obtener(), [usuarioId]: { ...cambios.obtener()[usuarioId], ...datos } })
  return null
}

export function cambiarPassword(usuarioId: number, actual: string, nueva: string): string | null {
  const usuario = todosLosUsuarios().find((u) => u.id === usuarioId)
  if (!usuario || usuario.password !== actual) return 'La contraseña actual no es correcta.'
  if (nueva.length < 6) return 'La nueva contraseña debe tener al menos 6 caracteres.'
  cambios.guardar({ ...cambios.obtener(), [usuarioId]: { ...cambios.obtener()[usuarioId], password: nueva } })
  return null
}

// TEMPORAL hasta conectar el módulo de usuarios a la API (paso 3): las cuentas que llegan del
// backend se copian aquí, sin contraseña, para que la búsqueda por cédula y las listas las vean.
export function recordarUsuarioDelServidor(usuario: Usuario) {
  if (todosLosUsuarios().some((u) => u.id === usuario.id)) return
  registrados.guardar([...registrados.obtener(), { ...usuario, password: '' }])
}

export function guardarRegistrado(datos: Omit<UsuarioConPassword, 'id' | 'creado'>): UsuarioConPassword {
  const nuevo: UsuarioConPassword = {
    ...datos,
    id: Math.max(...todosLosUsuarios().map((u) => u.id)) + 1,
    creado: Date.now(),
  }
  registrados.guardar([...registrados.obtener(), nuevo])
  return nuevo
}

export function cambiarCargo(usuarioId: number, cargo: Cargo) {
  cargos.guardar({ ...cargos.obtener(), [usuarioId]: cargo })
}

// Ignora mayúsculas y tildes: "nunez" encuentra "Nuñez".
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
