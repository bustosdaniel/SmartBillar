import type { Rol } from '../types'

export function rutaInicio(rol: Rol) {
  return rol === 'admin' ? '/admin' : '/cliente'
}
