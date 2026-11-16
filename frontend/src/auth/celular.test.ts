import { describe, expect, it } from 'vitest'
import { agrupar, buscarPais, dejarDigitosValidos, desdeInternacional, ejemplo, formatearCelular, PAISES } from './celular'

describe('celular', () => {
  it('agrupa el número según el país mientras se escribe', () => {
    expect(agrupar('3001234567', buscarPais('CO'))).toBe('300 123 4567')
    expect(agrupar('30012', buscarPais('CO'))).toBe('300 12')
    expect(agrupar('61234567', buscarPais('PA'))).toBe('6123 4567')
  })

  it('reconoce el país de un número guardado', () => {
    expect(desdeInternacional('+593991234567')).toMatchObject({ numero: '99 123 4567', reconocido: true })
    expect(desdeInternacional('+593991234567').pais.codigo).toBe('EC')
    expect(desdeInternacional('+5491123456789').pais.codigo).toBe('AR')
    // Los guardados antes del selector de país no traen indicativo: son colombianos.
    expect(desdeInternacional('3001234567').pais.codigo).toBe('CO')
  })

  it('muestra el número con indicativo y lo desconocido tal cual', () => {
    expect(formatearCelular('+573001234567')).toBe('+57 300 123 4567')
    expect(formatearCelular('3001234567')).toBe('+57 300 123 4567')
    expect(formatearCelular('+5491123456789')).toBe('+54 9 11 2345 6789')
    expect(formatearCelular('+447911123456')).toBe('+447911123456')
    expect(formatearCelular(undefined)).toBe('')
  })
})

describe('dejarDigitosValidos', () => {
  it('no deja escribir un dígito que no corresponde', () => {
    const colombia = buscarPais('CO')
    expect(dejarDigitosValidos('5', colombia)).toBe('')
    expect(dejarDigitosValidos('3001234567', colombia)).toBe('3001234567')
    expect(dejarDigitosValidos('30012345678', colombia)).toBe('3001234567')
    expect(dejarDigitosValidos('300 abc 123', colombia)).toBe('300123')
    // En Venezuela después de 41 solo va 2, 4 o 6: el 3 y el 1 siguientes no entran.
    expect(dejarDigitosValidos('4131234567', buscarPais('VE'))).toBe('41234567')
  })

  it('cada patrón a medias acepta el ejemplo completo de su país', () => {
    for (const pais of PAISES) {
      const digitos = ejemplo(pais).replace(/\D/g, '')
      expect(dejarDigitosValidos(digitos, pais)).toBe(digitos)
      expect(pais.patron.test(digitos)).toBe(true)
    }
  })
})
