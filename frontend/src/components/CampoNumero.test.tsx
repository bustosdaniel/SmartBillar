import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { LIMITES, type Limite } from '../utils/montos'
import { CampoNumero } from './CampoNumero'

afterEach(cleanup)

function Probar({ limite = LIMITES.inscripcion }: { limite?: Limite }) {
  const [valor, setValor] = useState('')
  return <CampoNumero aria-label="Valor" limite={limite} valor={valor} onValor={setValor} />
}

describe('CampoNumero', () => {
  it('deja de escribir al llegar al máximo', async () => {
    render(<Probar />)
    const campo = screen.getByLabelText('Valor') as HTMLInputElement
    await userEvent.type(campo, '5000009')
    expect(campo.value).toBe('500000')
  })

  it('al intentar pasar del máximo muestra el aviso, y se quita al escribir algo válido', async () => {
    render(<Probar />)
    const campo = screen.getByLabelText('Valor') as HTMLInputElement
    await userEvent.type(campo, '5000009')
    expect(screen.getByRole('alert').textContent).toMatch(/^No puede ser mayor que \$\s?500\.000\.$/)
    await userEvent.type(campo, '{Backspace}')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('no deja escribir letras ni decimales', async () => {
    render(<Probar />)
    const campo = screen.getByLabelText('Valor') as HTMLInputElement
    await userEvent.type(campo, '1a2.3e')
    expect(campo.value).toBe('123')
  })

  it('en el ajuste de tarifa se puede escribir el signo menos', async () => {
    render(<Probar limite={LIMITES.ajusteTarifa} />)
    const campo = screen.getByLabelText('Valor') as HTMLInputElement
    await userEvent.type(campo, '-1005')
    expect(campo.value).toBe('-100')
  })
})
