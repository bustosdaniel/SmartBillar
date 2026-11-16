import { useSyncExternalStore } from 'react'

// Lo que se está esperando del backend, para que la persona vea que algo está en proceso:
// - una barra delgada arriba de la pantalla (components/BarraEspera.tsx) mientras haya algo pendiente;
// - el botón que lo pidió se marca con aria-busy, y el CSS le pone un spinner y lo bloquea.
// Las recargas automáticas en segundo plano (cada pocos segundos) no cuentan: serían una barra eterna.

let pendientes = 0
const oyentes = new Set<() => void>()

function avisar() {
  for (const oyente of oyentes) oyente()
}

// El último botón que se tocó o el que envió un formulario. Una petición que empieza poco después
// (la validación y el await son casi inmediatos) se le atribuye a él.
let ultimoBoton: { boton: HTMLButtonElement; cuando: number } | null = null
const VENTANA_MS = 1500

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const boton = (e.target as Element | null)?.closest?.('button')
      if (boton) ultimoBoton = { boton, cuando: Date.now() }
    },
    true,
  )
  document.addEventListener(
    'submit',
    (e) => {
      const formulario = e.target as HTMLFormElement
      const boton = (e as SubmitEvent).submitter ?? formulario.querySelector('button[type="submit"], button:not([type])')
      if (boton instanceof HTMLButtonElement) ultimoBoton = { boton, cuando: Date.now() }
    },
    true,
  )
}

function botonQueLoPidio() {
  if (!ultimoBoton || Date.now() - ultimoBoton.cuando > VENTANA_MS || !ultimoBoton.boton.isConnected) return null
  return ultimoBoton.boton
}

// Envuelve una petición: cuenta como pendiente y marca su botón hasta que termine.
export async function esperar<T>(peticion: () => Promise<T>): Promise<T> {
  const boton = botonQueLoPidio()
  boton?.setAttribute('aria-busy', 'true')
  pendientes++
  avisar()
  try {
    return await peticion()
  } finally {
    pendientes--
    boton?.removeAttribute('aria-busy')
    avisar()
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function useEsperando() {
  return useSyncExternalStore(suscribir, () => pendientes > 0)
}
