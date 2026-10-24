import { Link } from 'react-router'
import { CheckCheck, Clock } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { BandejaNotificaciones } from '../../components/BandejaNotificaciones'
import { Encabezado } from '../../components/Encabezado'
import { useAhora } from '../../hooks/useAhora'
import { diasRestantes, estadoMembresia, useMembresias, usePlanes } from '../../membresias/membresias'
import { marcarTodasLeidas, useNotificaciones } from '../../notificaciones/notificaciones'

export function Notificaciones() {
  const { usuario } = useAuth()
  const todas = useNotificaciones()
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()

  const mias = todas.filter((n) => n.usuarioId === usuario?.id)
  const sinLeer = mias.filter((n) => !n.leida).length
  // Recordatorio calculado al momento (no se guarda, para no repetirlo cada día).
  const membresia = usuario ? membresias[usuario.id] : undefined
  const porVencer = membresia && estadoMembresia(membresia, ahora) === 'por-vencer'

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado
          titulo="Notificaciones"
          subtitulo={sinLeer > 0 ? `Tienes ${sinLeer} sin leer` : 'Estás al día'}
        />
        {sinLeer > 0 && usuario && (
          <button type="button" className="boton boton-secundario" onClick={() => marcarTodasLeidas(usuario.id)}>
            <CheckCheck size={16} aria-hidden="true" /> Marcar todas como leídas
          </button>
        )}
      </header>

      {porVencer && membresia && (
        <Link to="/cliente/membresia" className="aviso-claro aviso-ambar aviso-con-accion recordatorio">
          <span className="nota-icono">
            <Clock size={18} aria-hidden="true" /> Tu membresía {planes[membresia.planId].nombre} vence en{' '}
            {diasRestantes(membresia, ahora)} días. Renuévala para no perder tus beneficios.
          </span>
          <strong>Renovar →</strong>
        </Link>
      )}

      <BandejaNotificaciones
        notificaciones={mias}
        vacio="Aquí verás tus recibos de pago, avisos de torneos, de tu mesa y de tu membresía."
      />
    </section>
  )
}
