import { describe, expect, it } from 'vitest'
import { errorNumero, leerNumero, LIMITES, LIMITES_PRODUCTO, limitarTextoMonto, MONTO_MAXIMO } from './montos'

// Los campos de dinero del personal: nada de cifras absurdas ni precios irreales.

describe('errorNumero', () => {
  it('acepta un valor dentro del rango', () => {
    expect(errorNumero('12000', LIMITES.tarifaHora)).toBeNull()
  })

  it('pide un valor si el campo está vacío (texto o NaN)', () => {
    expect(errorNumero('', LIMITES.tarifaHora)).toBe('Escribe un valor.')
    expect(errorNumero(leerNumero(''), LIMITES.tarifaHora)).toBe('Escribe un valor.')
  })

  it('rechaza decimales', () => {
    expect(errorNumero('12000.5', LIMITES.tarifaHora)).toBe('Debe ser un número entero, sin decimales.')
  })

  it('rechaza una tarifa por hora exorbitante (el caso que reportó el desarrollador)', () => {
    expect(errorNumero('213123', LIMITES.tarifaHora)).toBe('No puede ser mayor que $ 50.000.')
  })

  it('muestra los porcentajes con su unidad', () => {
    expect(errorNumero('150', LIMITES.ajusteTarifa)).toBe('No puede ser mayor que 100%.')
    expect(errorNumero('-101', LIMITES.ajusteTarifa)).toBe('No puede ser menor que -100%.')
  })

  it('un egreso absurdo no pasa', () => {
    expect(errorNumero('23784689123712738912', LIMITES.egreso)).toMatch(/^No puede ser mayor que/)
  })
})

describe('precios de productos según su categoría', () => {
  it('una gaseosa no puede costar $500.000', () => {
    expect(errorNumero('500000', LIMITES_PRODUCTO.bebida)).toMatch(/^No puede ser mayor que/)
    expect(errorNumero('4000', LIMITES_PRODUCTO.bebida)).toBeNull()
  })

  it('unos paquetes tienen un tope menor que las bebidas', () => {
    expect(LIMITES_PRODUCTO.paquete.max).toBeLessThan(LIMITES_PRODUCTO.bebida.max)
    expect(errorNumero('18000', LIMITES_PRODUCTO.paquete)).toMatch(/^No puede ser mayor que/)
  })

  it('ningún producto es gratis', () => {
    expect(errorNumero('0', LIMITES_PRODUCTO.bebida)).toMatch(/^No puede ser menor que/)
  })
})

describe('limitarTextoMonto: el efectivo recibido no pasa del tope', () => {
  it('recorta lo que se pasa', () => {
    expect(limitarTextoMonto('99999999')).toBe(String(MONTO_MAXIMO))
  })

  it('deja igual lo que está dentro', () => {
    expect(limitarTextoMonto('50000')).toBe('50000')
  })
})
