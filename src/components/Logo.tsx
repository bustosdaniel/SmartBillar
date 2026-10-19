import { LEMA_APP, NOMBRE_APP } from '../config'

type LogoProps = {
  tamano?: 'sm' | 'lg'
  conLema?: boolean
}

export function Logo({ tamano = 'sm', conLema = false }: LogoProps) {
  return (
    <div className={`logo logo-${tamano}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true" className="logo-icono">
        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <line x1="6" y1="6" x2="58" y2="58" />
          <line x1="58" y1="6" x2="6" y2="58" />
        </g>
        <circle cx="32" cy="32" r="20" fill="#0b0f0d" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="9" fill="#F5F5F4" />
        <text x="32" y="36.5" textAnchor="middle" fontWeight="700" fontSize="13" fill="#0b0f0d">
          8
        </text>
      </svg>
      <div>
        <span className="logo-nombre">{NOMBRE_APP}</span>
        {conLema && <span className="logo-lema">{LEMA_APP}</span>}
      </div>
    </div>
  )
}
