// Lectura segura de localStorage/sessionStorage mientras no hay backend.
export function leer<T>(key: string, vacio: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : vacio
  } catch {
    return vacio
  }
}
