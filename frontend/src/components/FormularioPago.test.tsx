import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Caja } from '../types'
import { FormularioPago } from './FormularioPago'

// El formulario exige la caja abierta: se simula una para no depender del backend.
vi.mock('../caja/caja', () => ({
  NOMBRES_METODO: { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' },
  useCaja: (): Caja => ({ id: 1, apertura: 0, base: 100000, pagos: [], egresos: [], anulados: [] }),
}))

afterEach(cleanup)

function promesaPendiente() {
  let resolver!: () => void
  let rechazar!: (error: Error) => void
  const promesa = new Promise<void>((ok, mal) => {
    resolver = ok
    rechazar = mal
  })
  return { promesa, resolver, rechazar }
}

describe('FormularioPago', () => {
  it('un doble clic en Cobrar registra un solo pago', async () => {
    const usuario = userEvent.setup()
    const pago = promesaPendiente()
    const onPagar = vi.fn(() => pago.promesa)
    render(<FormularioPago total={15000} onCancelar={() => {}} onPagar={onPagar} />)

    await usuario.click(screen.getByRole('button', { name: 'Tarjeta' }))
    const cobrar = screen.getByRole('button', { name: /Cobrar/ })
    await usuario.dblClick(cobrar)

    expect(onPagar).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Cobrando…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    pago.resolver()
  })

  it('si el cobro falla, el botón vuelve a activarse para reintentar', async () => {
    const usuario = userEvent.setup()
    const pago = promesaPendiente()
    const onPagar = vi.fn(() => pago.promesa.catch(() => {}))
    render(<FormularioPago total={15000} onCancelar={() => {}} onPagar={onPagar} />)

    await usuario.click(screen.getByRole('button', { name: 'Tarjeta' }))
    await usuario.click(screen.getByRole('button', { name: /Cobrar/ }))
    pago.rechazar(new Error('Rechazado'))

    expect((await screen.findByRole('button', { name: /Cobrar/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('en efectivo no deja cobrar si falta dinero, y calcula el cambio', async () => {
    const usuario = userEvent.setup()
    const onPagar = vi.fn()
    render(<FormularioPago total={15000} onCancelar={() => {}} onPagar={onPagar} />)

    const recibido = screen.getByLabelText('¿Cuánto entregó el cliente?')
    await usuario.type(recibido, '10000')
    expect(screen.getByText('Falta')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Cobrar/ }) as HTMLButtonElement).disabled).toBe(true)

    await usuario.clear(recibido)
    await usuario.type(recibido, '20000')
    expect(screen.getByText('Cambio a devolver')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: /Cobrar/ }))
    expect(onPagar).toHaveBeenCalledWith({ metodo: 'efectivo', recibido: 20000, cambio: 5000 })
  })

  it('el efectivo recibido no pasa de $10.000.000', async () => {
    const usuario = userEvent.setup()
    render(<FormularioPago total={15000} onCancelar={() => {}} onPagar={vi.fn()} />)

    const recibido = screen.getByLabelText('¿Cuánto entregó el cliente?')
    await usuario.type(recibido, '999999999')
    expect((recibido as HTMLInputElement).value).toBe('10000000')
  })
})
