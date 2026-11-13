import { useEffect, useState } from 'react'
import { ErrorApi, pedir } from '../api/cliente'
import type { Cargo, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

// Contraseña de las cuentas que crea el personal en caja (la asigna el backend).
export const PASSWORD_TEMPORAL = '123456'

export const NOMBRES_CARGO: Record<Cargo, string> = {
  administrador: 'Administrador',
  cajero: 'Cajero / Operador',
}

// `actual`: la contraseña, que el backend exige solo si cambia el correo.
export type DatosPerfil = Pick<Usuario, 'nombre' | 'email'> & { telefono: string; actual?: string }

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

// Para pantallas del personal que listan clientes: vuelve a pedir la lista al abrirse. La carga del
// inicio de sesión puede haber fallado (backend reiniciándose) o quedado vieja (clientes registrados
// después), y entonces el selector mostraría solo a los que se buscaron a mano.
export function useRecargarUsuarios() {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  useEffect(() => {
    let vigente = true
    pedir<Usuario[]>('/usuarios')
      .then((lista) => {
        store.guardar(lista)
        if (vigente) setEstado('listo')
      })
      .catch(() => {
        if (vigente) setEstado('error')
      })
    return () => {
      vigente = false
    }
  }, [])
  return estado
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

// El personal busca al cliente por su correo (sin distinguir mayúsculas).
export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const buscado = email.trim()
  if (!buscado) return null
  try {
    const cliente = await pedir<Usuario>(`/usuarios/cliente?email=${encodeURIComponent(buscado)}`)
    recordarUsuario(cliente)
    return cliente
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 404) return null
    throw error
  }
}

// Clientes cuyo correo o nombre contiene el texto, para elegir mientras se escribe (mínimo 2 letras).
export async function sugerirClientes(texto: string): Promise<Usuario[]> {
  return pedir<Usuario[]>(`/usuarios/clientes/sugerencias?q=${encodeURIComponent(texto)}`)
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

// Cierra la sesión en los demás dispositivos; devuelve el token nuevo para seguir en este.
export async function cambiarPassword(actual: string, nueva: string): Promise<string> {
  const { token } = await pedir<{ token: string }>('/usuarios/yo/password', { metodo: 'PUT', cuerpo: { actual, nueva } })
  return token
}

export async function cambiarCargo(usuarioId: number, cargo: Cargo) {
  recordarUsuario(await pedir<Usuario>(`/usuarios/${usuarioId}/cargo`, { metodo: 'PATCH', cuerpo: { cargo } }))
}

// Solo el administrador. Sin historial, el cliente se borra de la base; con cobros, mesas o torneos se
// conserva para que la caja cuadre, pero ya no puede entrar ni aparece en la app. Su correo queda libre.
export async function eliminarCliente(clienteId: number): Promise<'borrado' | 'eliminado'> {
  const { modo } = await pedir<{ modo: 'borrado' | 'eliminado' }>(`/usuarios/clientes/${clienteId}`, { metodo: 'DELETE' })
  store.guardar(store.obtener().filter((u) => u.id !== clienteId))
  return modo
}

// Solo el administrador: contraseña temporal para el cliente que la olvidó y está en caja (se ve una vez).
export async function passwordTemporal(clienteId: number): Promise<string> {
  const { password } = await pedir<{ password: string }>(`/usuarios/clientes/${clienteId}/password-temporal`, { metodo: 'POST' })
  return password
}

// Ignora mayúsculas y tildes: "nunez" encuentra "Nuñez".
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
