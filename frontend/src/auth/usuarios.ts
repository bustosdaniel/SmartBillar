import { ErrorApi, pedir } from '../api/cliente'
import type { Cargo, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

// Contraseña de las cuentas que crea el personal en caja (la asigna el backend).
export const PASSWORD_TEMPORAL = '123456'

export const NOMBRES_CARGO: Record<Cargo, string> = {
  administrador: 'Administrador',
  cajero: 'Cajero / Operador',
}

export type DatosPerfil = Pick<Usuario, 'nombre' | 'email'> & { telefono: string; cedula: string }

// Los usuarios del prototipo vivían en el navegador; ahora están en MySQL. Se limpian una vez.
for (const clave of ['billar.registrados', 'billar.cargos', 'billar.perfiles']) localStorage.removeItem(clave)

// Usuarios que el backend deja ver a quien inició sesión: el personal ve a todos; un cliente, solo
// al personal (para enviarle avisos) y a sí mismo. Se cargan al iniciar sesión (AuthContext).
const store = crearStoreMemoria<Usuario[]>([])

export const useUsuarios = store.useValor
export const todosLosUsuarios = store.obtener

export async function cargarUsuarios(yo: Usuario) {
  const lista = yo.rol === 'admin' ? await pedir<Usuario[]>('/usuarios') : [...(await pedir<Usuario[]>('/usuarios/empleados')), yo]
  store.guardar(lista)
}

export function vaciarUsuarios() {
  store.guardar([])
}

// Pone (o actualiza) un usuario en la lista sin volver a pedirla completa.
export function recordarUsuario(usuario: Usuario) {
  store.guardar([...store.obtener().filter((u) => u.id !== usuario.id), usuario])
}

export function listarClientes(): Usuario[] {
  return store.obtener().filter((u) => u.rol === 'cliente')
}

// Solo los dígitos: "1.098.765.432" y "1098765432" son la misma cédula (igual que en el backend).
export function normalizarCedula(cedula: string) {
  return cedula.replace(/\D/g, '')
}

export async function buscarPorCedula(cedula: string): Promise<Usuario | null> {
  const buscada = normalizarCedula(cedula)
  if (!buscada) return null
  try {
    const cliente = await pedir<Usuario>(`/usuarios/cedula/${buscada}`)
    recordarUsuario(cliente)
    return cliente
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 404) return null
    throw error
  }
}

// El personal registra un cliente en caja; queda con PASSWORD_TEMPORAL.
export async function registrarCliente(datos: DatosPerfil): Promise<Usuario> {
  const cliente = await pedir<Usuario>('/usuarios/clientes', { cuerpo: datos })
  recordarUsuario(cliente)
  return cliente
}

export async function actualizarMiPerfil(datos: DatosPerfil): Promise<Usuario> {
  const actualizado = await pedir<Usuario>('/usuarios/yo', { metodo: 'PATCH', cuerpo: datos })
  recordarUsuario(actualizado)
  return actualizado
}

export async function cambiarPassword(actual: string, nueva: string) {
  await pedir<null>('/usuarios/yo/password', { metodo: 'PUT', cuerpo: { actual, nueva } })
}

export async function cambiarCargo(usuarioId: number, cargo: Cargo) {
  recordarUsuario(await pedir<Usuario>(`/usuarios/${usuarioId}/cargo`, { metodo: 'PATCH', cuerpo: { cargo } }))
}

// Ignora mayúsculas y tildes: "nunez" encuentra "Nuñez".
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
