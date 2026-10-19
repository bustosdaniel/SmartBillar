import type { CajaCerrada, MetodoPago, Pago } from '../types'

const DIA = 24 * 60 * 60 * 1000
const DIAS = 75

// Turnos de caja de los últimos días, solo para que los reportes tengan datos en la demo.
// Se usa únicamente si el navegador no tiene cajas cerradas guardadas.
export function historialDemo(): CajaCerrada[] {
  let semilla = 7
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647
    return semilla / 2147483647
  }
  const entre = (min: number, max: number) => Math.round((min + azar() * (max - min)) / 100) * 100
  const metodos: MetodoPago[] = ['efectivo', 'efectivo', 'transferencia', 'tarjeta']
  const clientes = ['Juan Pérez', 'Laura Gómez', 'Carlos', 'Andrés', 'Pedro', 'Sofía', 'Mateo']
  const gastos = ['Compra de tizas', 'Insumos en licoreria', 'Pago de servicios', 'Mantenimiento de mesas']

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  return Array.from({ length: DIAS }, (_, i) => {
    const dia = hoy.getTime() - (DIAS - i) * DIA
    const apertura = dia + 14 * 60 * 60 * 1000
    const finDeSemana = [0, 5, 6].includes(new Date(dia).getDay())
    const cantidad = Math.round((finDeSemana ? 12 : 6) + azar() * 6)

    const pagos: Pago[] = Array.from({ length: cantidad }, (_, j) => {
      const esMembresia = azar() < 0.1
      const metodo = metodos[Math.floor(azar() * metodos.length)]
      const monto = esMembresia ? [30000, 60000, 100000][Math.floor(azar() * 3)] : entre(6000, 36000)
      return {
        id: `demo-${i}-${j}`,
        fecha: apertura + j * 25 * 60 * 1000,
        concepto: esMembresia ? 'Membresía' : `Mesa ${1 + Math.floor(azar() * 8)}`,
        cliente: clientes[Math.floor(azar() * clientes.length)],
        monto,
        metodo,
        recibido: metodo === 'efectivo' ? monto : null,
        cambio: metodo === 'efectivo' ? 0 : null,
      }
    })
    const egresos = Array.from({ length: Math.floor(azar() * 3) }, (_, j) => ({
      id: `demo-e-${i}-${j}`,
      fecha: apertura + (j + 1) * 90 * 60 * 1000,
      concepto: gastos[Math.floor(azar() * gastos.length)],
      monto: entre(15000, 90000),
    }))
    return { apertura, base: 100000, pagos, egresos, cierre: apertura + 9 * 60 * 60 * 1000 }
  })
}
