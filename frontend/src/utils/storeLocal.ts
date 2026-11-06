import { useSyncExternalStore } from 'react'
import { leer } from './almacen'

// Estado compartido guardado en localStorage mientras no hay backend. El evento
// `storage` sincroniza otras pestañas (por ejemplo, admin y cliente a la vez).
export function crearStoreLocal<T>(key: string, vacio: T) {
  let valor = leer<T>(key, vacio)
  const oyentes = new Set<() => void>()

  function avisar() {
    oyentes.forEach((oyente) => oyente())
  }

  window.addEventListener('storage', (e) => {
    if (e.key !== key) return
    valor = leer<T>(key, vacio)
    avisar()
  })

  function suscribir(oyente: () => void) {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  }

  return {
    obtener: () => valor,
    guardar(nuevo: T) {
      valor = nuevo
      localStorage.setItem(key, JSON.stringify(nuevo))
      avisar()
    },
    useValor: () => useSyncExternalStore(suscribir, () => valor),
  }
}
