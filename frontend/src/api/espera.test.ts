import { afterEach, describe, expect, it } from 'vitest'
import { esperar } from './espera'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('esperar', () => {
  it('marca como ocupado el botón que pidió la acción hasta que termina', async () => {
    document.body.innerHTML = '<button type="button">Guardar</button>'
    const boton = document.querySelector('button')!
    let terminar: () => void = () => {}
    boton.addEventListener('click', () => {
      void esperar(() => new Promise<void>((listo) => (terminar = listo)))
    })
    boton.click()
    expect(boton.getAttribute('aria-busy')).toBe('true')
    terminar()
    await new Promise((listo) => setTimeout(listo, 0))
    expect(boton.hasAttribute('aria-busy')).toBe(false)
  })

  it('suelta el botón aunque la petición falle', async () => {
    document.body.innerHTML = '<button type="button">Guardar</button>'
    const boton = document.querySelector('button')!
    let resultado: Promise<unknown> = Promise.resolve()
    boton.addEventListener('click', () => {
      resultado = esperar(() => Promise.reject(new Error('sin conexión')))
    })
    boton.click()
    await expect(resultado).rejects.toThrow('sin conexión')
    expect(boton.hasAttribute('aria-busy')).toBe(false)
  })
})
