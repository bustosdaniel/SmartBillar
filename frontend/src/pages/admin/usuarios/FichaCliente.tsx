import { Mail, Phone } from 'lucide-react'
import { NOMBRES_METODO } from '../../../caja/caja'
import { mesasMock, NOMBRES_MODO } from '../../../mesas/datos'
import { estadoMembresia } from '../../../membresias/membresias'
import type { Membresia, Plan, SesionFinalizada, Torneo, Usuario } from '../../../types'
import { formatearDuracion, formatearFecha, formatearPesos } from '../../../utils/formato'

type FichaClienteProps = {
  cliente: Usuario
  partidas: SesionFinalizada[]
  membresia: Membresia | undefined
  plan: Plan | null
  torneos: Torneo[]
  ahora: number
}

export function FichaCliente({ cliente, partidas, membresia, plan, torneos, ahora }: FichaClienteProps) {
  const gastado = partidas.reduce((t, s) => t + s.total, 0)
  const recientes = partidas.toSorted((a, b) => b.fin - a.fin).slice(0, 5)

  return (
    <div className="formulario-claro ficha">
      <div className="ficha-contacto">
        <span>
          <Mail size={15} aria-hidden="true" /> {cliente.email}
        </span>
        {cliente.telefono && (
          <span>
            <Phone size={15} aria-hidden="true" /> {cliente.telefono}
          </span>
        )}
      </div>

      <dl className="resumen">
        <div>
          <dt>Membresía</dt>
          <dd>
            {membresia && plan
              ? `${plan.nombre} · ${estadoMembresia(membresia, ahora) === 'vencida' ? 'venció' : 'vence'} ${formatearFecha(membresia.vence)}`
              : 'Sin membresía'}
          </dd>
        </div>
        <div>
          <dt>Visitas</dt>
          <dd>{partidas.length}</dd>
        </div>
        <div>
          <dt>Total gastado en mesas</dt>
          <dd>{formatearPesos(gastado)}</dd>
        </div>
        <div>
          <dt>Torneos</dt>
          <dd>{torneos.length === 0 ? '—' : torneos.map((t) => t.nombre).join(', ')}</dd>
        </div>
      </dl>

      <h3 className="titulo-bloque">Últimas partidas</h3>
      {recientes.length === 0 ? (
        <p className="texto-suave">Aún no ha jugado en el club.</p>
      ) : (
        <ul className="movimientos">
          {recientes.map((s) => {
            const mesa = mesasMock.find((m) => m.id === s.mesaId)
            return (
              <li key={`${s.mesaId}-${s.inicio}`}>
                <span className="movimiento-texto">
                  <strong>
                    {mesa?.nombre ?? `Mesa ${s.mesaId}`} · {mesa ? NOMBRES_MODO[mesa.modo] : ''}
                  </strong>
                  <span>
                    {formatearFecha(s.fin)} · {formatearDuracion(s.tiempoMs)} · {NOMBRES_METODO[s.metodoPago]}
                  </span>
                </span>
                <strong>{formatearPesos(s.total)}</strong>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
