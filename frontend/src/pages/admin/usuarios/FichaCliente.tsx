import { useState } from 'react'
import { Mail, Phone, Trash2 } from 'lucide-react'
import { useEsAdministrador } from '../../../auth/useAuth'
import { eliminarCliente } from '../../../auth/usuarios'
import { NOMBRES_METODO } from '../../../caja/caja'
import { useTodasLasMesas, NOMBRES_MODO } from '../../../mesas/datos'
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
  // Se llama después de eliminar al cliente (para cerrar la ficha).
  onEliminado: () => void
}

export function FichaCliente({ cliente, partidas, membresia, plan, torneos, ahora, onEliminado }: FichaClienteProps) {
  const mesas = useTodasLasMesas()
  const esAdministrador = useEsAdministrador()
  const [confirmar, setConfirmar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  async function eliminar() {
    setEliminando(true)
    setError('')
    try {
      await eliminarCliente(cliente.id)
      onEliminado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar al cliente.')
      setEliminando(false)
      setConfirmar(false)
    }
  }
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
            const mesa = mesas.find((m) => m.id === s.mesaId)
            return (
              <li key={`${s.mesaId}-${s.inicio}`}>
                <span className="movimiento-texto">
                  <strong>
                    {mesa?.nombre ?? `Mesa ${s.mesaId}`} · {mesa ? NOMBRES_MODO[mesa.modo] : ''}
                  </strong>
                  <span>
                    {formatearFecha(s.fin)} · {formatearDuracion(s.tiempoMs)} · {s.metodoPago ? NOMBRES_METODO[s.metodoPago] : 'Cobro anulado'}
                  </span>
                </span>
                <strong>{formatearPesos(s.total)}</strong>
              </li>
            )
          })}
        </ul>
      )}

      {esAdministrador &&
        (confirmar ? (
          <div className="confirmar-anular" role="alertdialog" aria-label="Eliminar cliente">
            <p>
              ¿Eliminar a <strong>{cliente.nombre}</strong>? Ya no podrá iniciar sesión ni aparecerá en la app, y su correo
              quedará libre para registrarse de nuevo. Sus cobros, partidas y torneos se conservan en caja y reportes. No se
              puede deshacer.
            </p>
            <div className="dialogo-acciones">
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmar(false)} disabled={eliminando}>
                Cancelar
              </button>
              <button type="button" className="boton boton-peligro" onClick={eliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="boton-enlace" onClick={() => setConfirmar(true)}>
            <Trash2 size={15} aria-hidden="true" /> Eliminar cliente
          </button>
        ))}
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
    </div>
  )
}
