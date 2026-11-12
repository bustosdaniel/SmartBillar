import { pedir } from '../api/cliente'
import type { Movimiento, Usuario } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'

// Cada cuánto se vuelven a pedir ("Últimos movimientos" del Inicio del personal).
const REFRESCO_MS = 10_000

// Antes vivían en el navegador; ahora están en MySQL. Se limpia una vez.
localStorage.removeItem('billar.movimientos')

const store = crearStoreMemoria<Movimiento[]>([])

export const useMovimientos = store.useValor

let yo: Usuario | null = null
let refresco: number | undefined

async function recargar() {
  if (yo?.rol !== 'admin') return
  const lista = await pedir<Movimiento[]>('/movimientos')
  if (yo) store.guardar(lista)
}

// Lo llama AuthContext al iniciar sesión. Los clientes no ven la actividad del club.
export function cargarMovimientos(usuario: Usuario) {
  yo = usuario
  window.clearInterval(refresco)
  if (usuario.rol !== 'admin') return Promise.resolve()
  refresco = window.setInterval(() => recargar().catch(() => {}), REFRESCO_MS)
  return recargar()
}

export function vaciarMovimientos() {
  yo = null
  window.clearInterval(refresco)
  store.guardar([])
}

