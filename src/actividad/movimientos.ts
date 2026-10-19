import type { Movimiento } from '../types'
import { crearStoreLocal } from '../utils/storeLocal'

const MAXIMO = 50

const store = crearStoreLocal<Movimiento[]>('billar.movimientos', [])

export const useMovimientos = store.useValor

export function registrarMovimiento(movimiento: Omit<Movimiento, 'id' | 'fecha'>) {
  const fecha = Date.now()
  const nuevo: Movimiento = { ...movimiento, id: `${fecha}-${Math.random().toString(36).slice(2, 7)}`, fecha }
  store.guardar([nuevo, ...store.obtener()].slice(0, MAXIMO))
}
