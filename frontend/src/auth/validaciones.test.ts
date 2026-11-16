import { describe, expect, it } from 'vitest'
import { dejarCorreoValido, leerDatosPersonales, validarCambioPassword, validarDatosPersonales, validarLogin, validarRegistro, validarRestablecer } from './validaciones'

// Las mismas reglas están en el backend (schemas/usuarios.py): estas pruebas fijan lo que ve el usuario.

const formulario = (campos: Record<string, string>) => {
  const datos = new FormData()
  for (const [campo, valor] of Object.entries(campos)) datos.set(campo, valor)
  return datos
}

const validos = {
  primer_nombre: 'Daniel',
  segundo_nombre: '',
  primer_apellido: 'Bustos',
  segundo_apellido: 'Carrillo',
  email: 'daniel@correo.com',
  telefono: '300 123 4567',
}

describe('validarDatosPersonales', () => {
  it('acepta datos correctos (el segundo nombre es opcional)', () => {
    expect(validarDatosPersonales(formulario(validos))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, segundo_nombre: 'Esteban' }))).toEqual({})
  })

  it('exige primer nombre, los dos apellidos, correo y celular', () => {
    const vacios = { primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', email: '', telefono: '' }
    expect(validarDatosPersonales(formulario(vacios))).toEqual({
      primer_nombre: 'El primer nombre es obligatorio.',
      primer_apellido: 'El primer apellido es obligatorio.',
      segundo_apellido: 'El segundo apellido es obligatorio.',
      email: 'El correo es obligatorio.',
      telefono: 'El celular es obligatorio.',
    })
  })

  it('cada parte del nombre tiene máximo 25 caracteres', () => {
    expect(validarDatosPersonales(formulario({ ...validos, primer_apellido: 'a'.repeat(25) }))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, primer_apellido: 'a'.repeat(26) })).primer_apellido).toBe(
      'El primer apellido no puede tener más de 25 caracteres.',
    )
  })

  it('cada parte del nombre solo lleva letras (con tildes)', () => {
    expect(validarDatosPersonales(formulario({ ...validos, primer_nombre: 'José', primer_apellido: 'Núñez' }))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, segundo_nombre: '374727834' })).segundo_nombre).toBe(
      'El segundo nombre solo puede tener letras.',
    )
    expect(validarDatosPersonales(formulario({ ...validos, segundo_apellido: 'C' })).segundo_apellido).toBe(
      'El segundo apellido debe tener al menos 2 letras.',
    )
  })

  it('envía las partes del nombre sin espacios de más', () => {
    expect(leerDatosPersonales(formulario({ ...validos, primer_apellido: '  De   la Cruz ' })).primer_apellido).toBe('De la Cruz')
  })

  it('el correo necesita @ y terminación, y después de ".com" solo el país', () => {
    for (const email of ['a@gmail.com', 'a.b@campusucc.edu.co', 'a@empresa.com.co']) {
      expect(validarDatosPersonales(formulario({ ...validos, email }))).toEqual({})
    }
    for (const email of ['a@gmail', 'a@gmail.com.coo', 'a@gmail.com.co.x', 'a..b@gmail.com']) {
      expect(validarDatosPersonales(formulario({ ...validos, email })).email).toBe('El correo no es válido.')
    }
  })

  it('rechaza un correo sin dominio', () => {
    expect(validarDatosPersonales(formulario({ ...validos, email: 'daniel@correo' })).email).toBe('El correo no es válido.')
  })

  it('el celular colombiano tiene 10 dígitos y empieza por 3 (Colombia es el país por defecto)', () => {
    expect(validarDatosPersonales(formulario({ ...validos, telefono: '300 123 4567' }))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, telefono: '300 123 456' })).telefono).toBe(
      'El celular de Colombia debe tener 10 dígitos.',
    )
    expect(validarDatosPersonales(formulario({ ...validos, telefono: '601 123 4567' })).telefono).toBe(
      'No es un celular válido de Colombia.',
    )
  })

  it('valida el celular según el país escogido', () => {
    expect(validarDatosPersonales(formulario({ ...validos, pais: 'ES', telefono: '612 345 678' }))).toEqual({})
    expect(validarDatosPersonales(formulario({ ...validos, pais: 'ES', telefono: '300 123 4567' })).telefono).toBe(
      'El celular de España debe tener 9 dígitos.',
    )
  })

  it('envía el celular en formato internacional', () => {
    expect(leerDatosPersonales(formulario({ ...validos, pais: 'CO', telefono: '300 123 4567' })).telefono).toBe('+573001234567')
    expect(leerDatosPersonales(formulario({ ...validos, pais: 'AR', telefono: '11 2345 6789' })).telefono).toBe('+5491123456789')
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

describe('dejarCorreoValido', () => {
  it('no deja escribir lo que no va en un correo', () => {
    expect(dejarCorreoValido('neifer bustos@gmail.com')).toBe('neiferbustos@gmail.com')
    expect(dejarCorreoValido('a@b@gmail.com')).toBe('a@bgmail.com')
    expect(dejarCorreoValido('@gmail.com')).toBe('gmail.com')
    expect(dejarCorreoValido('a..b@gmail.com')).toBe('a.b@gmail.com')
    expect(dejarCorreoValido('ñandú@gmail.com')).toBe('and@gmail.com')
  })

  it('después de ".com" no se puede escribir nada más, salvo el país', () => {
    expect(dejarCorreoValido('a@gmail.comxyz')).toBe('a@gmail.com')
    expect(dejarCorreoValido('a@gmail.com.co')).toBe('a@gmail.com.co')
    expect(dejarCorreoValido('a@gmail.com.coxx.y')).toBe('a@gmail.com.co')
    expect(dejarCorreoValido('a.b@campusucc.edu.co')).toBe('a.b@campusucc.edu.co')
  })
})
