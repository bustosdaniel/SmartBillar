import type { CategoriaProducto, Consumo, Producto } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'
import { IMAGEN_PRODUCTO } from './imagenes'

export const CATEGORIAS: CategoriaProducto[] = ['bebida', 'paquete']

export const NOMBRES_CATEGORIA: Record<CategoriaProducto, string> = {
  bebida: 'Bebidas',
  paquete: 'Paquetes',
}

// Menú del diagrama de flujo de consumos. Precios de prueba: el admin los cambia en Consumos.
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

const store = crearStoreLocal<Producto[]>('billar.productos', PRODUCTOS_INICIALES)

export const useProductos = store.useValor
export const obtenerProductos = store.obtener

export function guardarPrecios(precios: Record<string, number>) {
  store.guardar(store.obtener().map((p) => ({ ...p, precio: Math.max(0, precios[p.id] ?? p.precio) })))
}

export function imagenProducto(id: string): string | undefined {
  return IMAGEN_PRODUCTO[id]
}

export function totalConsumos(consumos: Consumo[] | undefined) {
  return (consumos ?? []).reduce((total, c) => total + c.precio * c.cantidad, 0)
}

export function mensajeAgregado(producto: Producto) {
  return producto.categoria === 'bebida' ? 'Bebida añadida con éxito' : 'Paquete añadido con éxito'
}
