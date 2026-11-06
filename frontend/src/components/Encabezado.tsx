import type { ReactNode } from 'react'

export function Encabezado({ titulo, subtitulo }: { titulo: ReactNode; subtitulo?: string }) {
  return (
    <header className="encabezado">
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
    </header>
  )
}
