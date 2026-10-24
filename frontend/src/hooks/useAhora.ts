import { useSyncExternalStore } from 'react'

// Reloj compartido: un solo intervalo para todos los cronómetros en pantalla.
let ahora = Date.now()
let intervalo: number | undefined
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  if (oyentes.size === 1) {
    ahora = Date.now()
    intervalo = window.setInterval(() => {
      ahora = Date.now()
      oyentes.forEach((o) => o())
    }, 1000)
  }
  return () => {
    oyentes.delete(oyente)
    if (oyentes.size === 0) window.clearInterval(intervalo)
  }
}

export function useAhora() {
  return useSyncExternalStore(suscribir, () => ahora)
}
