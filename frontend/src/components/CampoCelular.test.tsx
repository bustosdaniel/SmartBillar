import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { CampoCelular } from './CampoCelular'

afterEach(cleanup)

describe('CampoCelular', () => {
  it('en Colombia deja de escribir al llegar a 10 dígitos', async () => {
    render(<CampoCelular variante="claro" />)
    const campo = screen.getByLabelText('Celular') as HTMLInputElement
    await userEvent.type(campo, '300123456789')
    expect(campo.value).toBe('300 123 4567')
  })

  it('no deja escribir un primer dígito que no corresponde', async () => {
    render(<CampoCelular variante="claro" />)
    const campo = screen.getByLabelText('Celular') as HTMLInputElement
    await userEvent.type(campo, '5a3')
    expect(campo.value).toBe('3')
  })
})
