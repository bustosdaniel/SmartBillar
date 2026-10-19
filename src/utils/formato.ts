const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })
const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatearPesos(valor: number) {
  return pesos.format(valor)
}

export function formatearHora(timestamp: number) {
  return hora.format(timestamp)
}

export function formatearDuracion(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatearFecha(timestamp: number) {
  return fecha.format(timestamp)
}

export function esMismoDia(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// Para cantidades de tiempo (no cronómetros): "5 h", "1 h 30 min", "45 min".
export function formatearHorasMin(ms: number) {
  const minutos = Math.round(ms / 60000)
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
