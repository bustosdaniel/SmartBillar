import { useSyncExternalStore } from 'react'

// Estado compartido solo en memoria (no se guarda en el navegador): datos que vienen del backend
// y se vuelven a pedir al abrir la app.
export function crearStoreMemoria<T>(inicial: T) {
  let valor = inicial
  const oyentes = new Set<() => void>()

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
      oyentes.forEach((oyente) => oyente())
    },
    useValor: () => useSyncExternalStore(suscribir, () => valor),
  }
}
