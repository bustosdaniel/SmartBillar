import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GraficaDona } from './GraficaDona'

afterEach(cleanup)

const porciones = [
  { nombre: 'Mesas', valor: 75000, color: '#2a78d6' },
  { nombre: 'Membresías', valor: 25000, color: '#eb6834' },
  { nombre: 'Torneos', valor: 0, color: '#1baf7a' },
]

describe('GraficaDona', () => {
  it('dibuja una porción por concepto con valor y la leyenda trae el % de cada uno', () => {
    const { container } = render(<GraficaDona titulo="Ingresos" porciones={porciones} />)
    expect(container.querySelectorAll('path.dona-porcion')).toHaveLength(2)
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('25%')).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Ingresos: Mesas 75%, Membresías 25%')
  })

  it('sin ingresos muestra el anillo vacío', () => {
    const { container } = render(<GraficaDona titulo="Ingresos" porciones={porciones.map((p) => ({ ...p, valor: 0 }))} />)
    expect(container.querySelector('.dona-vacia')).toBeTruthy()
  })
})
