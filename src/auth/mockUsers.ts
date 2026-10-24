import type { Usuario } from '../types'

// Datos de prueba mientras el backend no está listo.
export const usuariosMock: (Usuario & { password: string })[] = [
  { id: 1, nombre: 'Cliente Demo', email: 'cliente@billar.com', password: '123456', rol: 'cliente', telefono: '3001234567', cedula: '1098765432' },
  { id: 2, nombre: 'Admin Demo', email: 'admin@billar.com', password: '123456', rol: 'admin', cargo: 'administrador' },
  { id: 3, nombre: 'Juan Pérez', email: 'juan@billar.com', password: '123456', rol: 'cliente', telefono: '3109876543', cedula: '1012345678' },
  { id: 4, nombre: 'Laura Gómez', email: 'laura@billar.com', password: '123456', rol: 'cliente', telefono: '3205551234', cedula: '1023456789' },
  // Equipo del proyecto como empleados del club.
  {
    id: 5,
    nombre: 'Jader Erit Nuñez Bacheloth',
    email: 'jader@billar.com',
    password: '123456',
    rol: 'admin',
    cargo: 'administrador',
  },
  {
    id: 6,
    nombre: 'Daniel Esteban Ramírez Cristancho',
    email: 'daniel@billar.com',
    password: '123456',
    rol: 'admin',
    cargo: 'administrador',
  },
  {
    id: 7,
    nombre: 'Neifer Daniel Bustos Carrillo',
    email: 'neifer@billar.com',
    password: '123456',
    rol: 'admin',
    cargo: 'cajero',
  },
]
