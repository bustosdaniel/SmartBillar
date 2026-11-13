import { describe, expect, it } from 'vitest'
import type { ConfigTarifas, ReglaHorario } from '../types'
import { cruceDeReglas, preciosAl, reglaVigente } from './tarifas'

// Las fechas se arman en la hora local, como las lee reglaVigente. 2026-11-12 es jueves.
const fecha = (dia: number, hora: number, minuto = 0) => new Date(2026, 10, dia, hora, minuto).getTime()
const JUEVES = 12
const VIERNES = 13
const SABADO = 14
const DOMINGO = 15
const LUNES = 16

const regla = (datos: Partial<ReglaHorario>): ReglaHorario => ({
  id: 1,
  nombre: 'Regla',
  dias: [1, 2, 3, 4],
  desde: '14:00',
  hasta: '17:00',
  ajuste: -10,
  ...datos,
})

const horaFeliz = regla({ id: 'hora-feliz', nombre: 'Hora feliz' })
const nocheFinde = regla({ id: 'noche', nombre: 'Noche de fin de semana', dias: [5, 6], desde: '20:00', hasta: '02:00', ajuste: 15 })
const reglas = [horaFeliz, nocheFinde]

describe('reglaVigente: depende del día y de la hora', () => {
  it('aplica dentro de la franja', () => {
    expect(reglaVigente(reglas, fecha(JUEVES, 16, 45))?.nombre).toBe('Hora feliz')
  })

  it('la hora de fin ya no está incluida', () => {
    expect(reglaVigente(reglas, fecha(JUEVES, 17, 0))).toBeNull()
  })

  it('no aplica un día que no está en la regla', () => {
    expect(reglaVigente(reglas, fecha(VIERNES, 15, 0))).toBeNull()
  })

  it('una franja que cruza la medianoche sigue en la madrugada del día siguiente', () => {
    expect(reglaVigente(reglas, fecha(VIERNES, 23, 0))?.nombre).toBe('Noche de fin de semana')
    expect(reglaVigente(reglas, fecha(SABADO, 1, 30))?.nombre).toBe('Noche de fin de semana')
    // La noche del sábado sigue el domingo de madrugada…
    expect(reglaVigente(reglas, fecha(DOMINGO, 1, 30))?.nombre).toBe('Noche de fin de semana')
    // …pero el domingo no tiene noche propia: el lunes de madrugada ya no aplica.
    expect(reglaVigente(reglas, fecha(LUNES, 1, 30))).toBeNull()
  })
})

describe('preciosAl: la tarifa se ajusta y se redondea a la centena', () => {
  const config: ConfigTarifas = {
    porModo: { pool: { hora: 12000 }, 'tres-bandas': { hora: 15000 }, libre: { hora: 10000 } },
    reglas,
  }

  it('sin regla, el precio base', () => {
    expect(preciosAl(config, 'pool', fecha(LUNES, 10)).hora).toBe(12000)
  })

  it('con descuento del 10%', () => {
    expect(preciosAl(config, 'pool', fecha(JUEVES, 15)).hora).toBe(10800)
  })

  it('con recargo del 15%', () => {
    expect(preciosAl(config, 'tres-bandas', fecha(SABADO, 21)).hora).toBe(17300)
  })
})

describe('cruceDeReglas: dos tarifas no pueden aplicar a la misma hora', () => {
  it('las tarifas actuales del club no se cruzan', () => {
    expect(cruceDeReglas(nocheFinde, horaFeliz)).toBeNull()
  })

  it('detecta un cruce el mismo día', () => {
    const tarde = regla({ nombre: 'Tarde', dias: [4], desde: '16:00', hasta: '18:00' })
    expect(cruceDeReglas(tarde, horaFeliz)).toBe('Se cruza con «Hora feliz» el jueves a las 16:00. Ajusta los días u horas.')
  })

  it('detecta un cruce en la madrugada de una franja que pasa la medianoche', () => {
    const temprano = regla({ nombre: 'Domingo temprano', dias: [0], desde: '01:00', hasta: '05:00' })
    expect(cruceDeReglas(temprano, nocheFinde)).toContain('el domingo a las 01:00')
  })

  it('dos franjas pegadas (una termina cuando empieza la otra) no se cruzan', () => {
    const manana = regla({ dias: [1], desde: '10:00', hasta: '12:00' })
    const mediodia = regla({ dias: [1], desde: '12:00', hasta: '14:00' })
    expect(cruceDeReglas(manana, mediodia)).toBeNull()
  })

  it('no compara reglas incompletas (esas ya tienen su propio error)', () => {
    expect(cruceDeReglas(regla({ desde: '' }), horaFeliz)).toBeNull()
  })
})
