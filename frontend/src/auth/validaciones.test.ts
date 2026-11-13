import { describe, expect, it } from 'vitest'
import { validarCambioPassword, validarDatosPersonales, validarLogin, validarRegistro, validarRestablecer } from './validaciones'

// Las mismas reglas están en el backend (schemas/usuarios.py): estas pruebas fijan lo que ve el usuario.

const formulario = (campos: Record<string, string>) => {
  const datos = new FormData()
  for (const [campo, valor] of Object.entries(campos)) datos.set(campo, valor)
  return datos
}

const validos = { nombre: 'Daniel Bustos', email: 'daniel@correo.com', telefono: '300 123 4567' }

describe('validarDatosPersonales', () => {
  it('acepta datos correctos', () => {
    expect(validarDatosPersonales(formulario(validos))).toEqual({})
  })

  it('exige todos los campos', () => {
    expect(validarDatosPersonales(formulario({ nombre: '', email: '', telefono: '' }))).toEqual({
      nombre: 'El nombre es obligatorio.',
      email: 'El correo es obligatorio.',
      telefono: 'El celular es obligatorio.',
    })
  })

  it('el nombre solo lleva letras (con tildes) y espacios', () => {
    expect(validarDatosPersonales(formulario({ ...validos, nombre: 'José Núñez' }))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, nombre: 'Daniel123' })).nombre).toBe(
      'El nombre solo puede tener letras y espacios.',
    )
    expect(validarDatosPersonales(formulario({ ...validos, nombre: 'Al' })).nombre).toBe(
      'El nombre debe tener al menos 3 caracteres.',
    )
  })

  it('rechaza un correo sin dominio', () => {
    expect(validarDatosPersonales(formulario({ ...validos, email: 'daniel@correo' })).email).toBe('El correo no es válido.')
  })

  it('acepta celulares colombianos con o sin indicativo y separadores', () => {
    for (const telefono of ['3001234567', '+57 300 123 4567', '57-300-123-4567']) {
      expect(validarDatosPersonales(formulario({ ...validos, telefono }))).toEqual({})
    }
  })

  it('rechaza celulares que no empiezan por 3 o no tienen 10 dígitos', () => {
    for (const telefono of ['6011234567', '300123456', '30012345678']) {
      expect(validarDatosPersonales(formulario({ ...validos, telefono })).telefono).toBe(
        'El celular debe tener 10 dígitos y empezar por 3.',
      )
    }
  })
})

describe('validarRegistro: contraseña segura y confirmada', () => {
  const registro = (password: string, confirmar = password) => validarRegistro(formulario({ ...validos, password, confirmar }))

  it('acepta una contraseña que cumple todo', () => {
    expect(registro('Billar2026*')).toEqual({})
  })

  it.each([
    ['corta', 'Ab1*'],
    ['sin mayúscula', 'billar2026*'],
    ['sin minúscula', 'BILLAR2026*'],
    ['sin número', 'BillarBola*'],
    ['sin carácter especial', 'Billar2026'],
  ])('rechaza una contraseña %s', (_caso, password) => {
    expect(registro(password).password).toBe('La contraseña no cumple los requisitos.')
  })

  it('las dos contraseñas deben coincidir', () => {
    expect(registro('Billar2026*', 'Billar2026#').confirmar).toBe('Las contraseñas no coinciden.')
  })
})

describe('validarCambioPassword', () => {
  it('la nueva debe ser distinta de la actual', () => {
    const errores = validarCambioPassword(formulario({ actual: 'Billar2026*', nueva: 'Billar2026*', confirmar: 'Billar2026*' }))
    expect(errores.nueva).toBe('La contraseña nueva debe ser distinta de la actual.')
  })

  it('pide la contraseña actual', () => {
    expect(validarCambioPassword(formulario({ actual: '', nueva: 'Nueva2026*', confirmar: 'Nueva2026*' })).actual).toBe(
      'La contraseña actual es obligatoria.',
    )
  })
})

describe('validarLogin', () => {
  it('solo pide que los campos estén llenos (la contraseña la revisa el backend)', () => {
    expect(validarLogin(formulario({ email: 'daniel@correo.com', password: '123456' }))).toEqual({})
  })
})

describe('validarRestablecer: contraseña nueva desde el enlace del correo', () => {
  it('acepta una contraseña segura y confirmada', () => {
    expect(validarRestablecer(formulario({ nueva: 'Nueva2026*', confirmar: 'Nueva2026*' }))).toEqual({})
  })

  it('aplica las mismas reglas que el registro', () => {
    expect(validarRestablecer(formulario({ nueva: '123456', confirmar: '123456' })).nueva).toBe(
      'La contraseña nueva no cumple los requisitos.',
    )
  })
})
