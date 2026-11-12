import { pedir } from '../api/cliente'
import type { CategoriaProducto, Consumo, Producto } from '../types'
import { crearStoreMemoria } from '../utils/storeMemoria'
import { IMAGEN_PRODUCTO } from './imagenes'

export const CATEGORIAS: CategoriaProducto[] = ['bebida', 'paquete']

export const NOMBRES_CATEGORIA: Record<CategoriaProducto, string> = {
  bebida: 'Bebidas',
  paquete: 'Paquetes',
}

// Menú del diagrama de flujo de consumos, mientras llega el del backend (igual a los seeds).
const PRODUCTOS_INICIALES: Producto[] = [
  { id: 'gaseosa', nombre: 'Gaseosa', categoria: 'bebida', precio: 4000 },
  { id: 'cerveza', nombre: 'Cerveza', categoria: 'bebida', precio: 6000 },
  { id: 'agua', nombre: 'Agua', categoria: 'bebida', precio: 3000 },
  { id: 'jugo', nombre: 'Jugo', categoria: 'bebida', precio: 5000 },
  { id: 'papas-margarita', nombre: 'Papas Margarita', categoria: 'paquete', precio: 3500 },
  { id: 'super-ricas', nombre: 'Super Ricas', categoria: 'paquete', precio: 3500 },
  { id: 'de-todito', nombre: 'De Todito', categoria: 'paquete', precio: 5000 },
  { id: 'todo-rico', nombre: 'Todo Rico', categoria: 'paquete', precio: 4500 },
]

const store = crearStoreMemoria<Producto[]>(PRODUCTOS_INICIALES)

export const useProductos = store.useValor
export const obtenerProductos = store.obtener

export async function recargarProductos() {
  store.guardar(await pedir<Producto[]>('/mesas/productos'))
}

// Solo el administrador. Lo ya pedido en una mesa conserva el precio con el que se pidió.
export async function guardarPrecios(precios: Record<string, number>) {
  store.guardar(await pedir<Producto[]>('/mesas/productos/precios', { metodo: 'PUT', cuerpo: { precios } }))
}

export function imagenProducto(id: string): string | undefined {
  return IMAGEN_PRODUCTO[id]
}

export function totalConsumos(consumos: Consumo[]) {
  return consumos.reduce((total, c) => total + c.precio * c.cantidad, 0)
}

export function mensajeAgregado(producto: Producto) {
  return producto.categoria === 'bebida' ? 'Bebida añadida con éxito' : 'Paquete añadido con éxito'
}
