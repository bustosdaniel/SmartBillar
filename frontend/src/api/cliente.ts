// Cliente HTTP del backend (FastAPI). Vite redirige /api al puerto 8000 (vite.config.ts).
// El token de la sesión va en cada petición; los errores llegan como { detail: "mensaje" }.

export class ErrorApi extends Error {
  readonly estado: number

  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.estado = estado
  }
}

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.'

let token: string | null = null

export function fijarToken(nuevo: string | null) {
  token = nuevo
}

type Opciones = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo?: unknown
}

export async function pedir<T>(ruta: string, { metodo, cuerpo }: Opciones = {}): Promise<T> {
  const conCuerpo = cuerpo !== undefined
  let respuesta: Response
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo ?? (conCuerpo ? 'POST' : 'GET'),
      headers: {
        ...(conCuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: conCuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(SIN_CONEXION, 0)
  }

  const datos: unknown = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const detalle = (datos as { detail?: unknown } | null)?.detail
    if (typeof detalle === 'string') throw new ErrorApi(detalle, respuesta.status)
    // Sin respuesta JSON del backend: Vite no pudo llegar al puerto 8000.
    if (datos === null && respuesta.status >= 500) throw new ErrorApi(SIN_CONEXION, respuesta.status)
    throw new ErrorApi('Ocurrió un error inesperado. Intenta de nuevo.', respuesta.status)
  }
  return datos as T
}
