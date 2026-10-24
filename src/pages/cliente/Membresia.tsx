import { Clock, Percent, PiggyBank } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { TarjetaPlan } from '../../components/TarjetaPlan'
import { useAhora } from '../../hooks/useAhora'
import { gratisUsadoEnMes } from '../../mesas/cuenta'
import { useSesionesFinalizadas } from '../../mesas/sesiones'
import {
  cancelarSolicitud,
  diasRestantes,
  estadoMembresia,
  PLAN_IDS,
  solicitarPlan,
  useMembresias,
  usePlanes,
  useSolicitudes,
} from '../../membresias/membresias'
import type { EstadoMembresia } from '../../types'
import { formatearFecha, formatearHorasMin, formatearPesos } from '../../utils/formato'

const HORA = 60 * 60 * 1000
const DURACION_DIAS = 30

const TEXTO_ESTADO: Record<EstadoMembresia, string> = {
  activa: 'Activa',
  'por-vencer': 'Por vencer',
  vencida: 'Vencida',
}

export function Membresia() {
  const { usuario } = useAuth()
  const planes = usePlanes()
  const membresias = useMembresias()
  const solicitudes = useSolicitudes()
  const solicitud = usuario ? solicitudes[usuario.id] : undefined
  const finalizadas = useSesionesFinalizadas()
  const ahora = useAhora()

  const membresia = usuario ? membresias[usuario.id] : undefined
  const plan = membresia ? planes[membresia.planId] : null
  const estado = membresia ? estadoMembresia(membresia, ahora) : null

  const comparativa = (
    <>
      <h2 className="titulo-bloque">{membresia ? 'Cambia o renueva tu plan' : 'Elige tu plan'}</h2>
      {solicitud && (
        <div className="aviso-claro aviso-ambar aviso-con-accion">
          <span>
            Solicitaste el plan <strong>{planes[solicitud.planId].nombre}</strong>. Acércate a la caja para pagarlo (
            {formatearPesos(planes[solicitud.planId].precioMensual)}) y quedará activo.
          </span>
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => cancelarSolicitud(solicitud.clienteId, 'cliente')}>
            Cancelar solicitud
          </button>
        </div>
      )}
      <div className="grid-planes">
        {PLAN_IDS.map((id) => {
          const esMiPlan = plan?.id === id && estado !== 'vencida'
          const solicitado = solicitud?.planId === id
          return (
            <TarjetaPlan
              key={id}
              plan={planes[id]}
              destacado={esMiPlan || solicitado}
              etiqueta={esMiPlan ? 'Tu plan' : solicitado ? 'Solicitado' : undefined}
            >
              {usuario &&
                (solicitado ? (
                  <span className="estado membresia-por-vencer estado-bloque">Pendiente de pago en caja</span>
                ) : (
                  <button
                    type="button"
                    className={`boton ${esMiPlan ? 'boton-secundario' : ''}`}
                    onClick={() => solicitarPlan(usuario, id)}
                  >
                    {esMiPlan ? 'Renovar' : membresia ? `Cambiar a ${planes[id].nombre}` : `Quiero ${planes[id].nombre}`}
                  </button>
                ))}
            </TarjetaPlan>
          )
        })}
      </div>
      <p className="nota">Eliges el plan aquí y lo pagas en la caja del club; el personal lo activa al cobrar.</p>
    </>
  )

  if (!membresia || !plan || !estado) {
    return (
      <section className="pagina">
        <Encabezado titulo="Mi membresía" subtitulo="Tu plan y sus beneficios" />
        <div className="tarjeta sin-mesa">
          <PiggyBank size={36} aria-hidden="true" />
          <h2>Aún no tienes membresía</h2>
          <p className="texto-suave">
            Con una membresía pagas menos por hora de mesa, tienes horas gratis cada mes y descuentos en torneos.
          </p>
        </div>
        {comparativa}
      </section>
    )
  }

  const usado = usuario ? gratisUsadoEnMes(finalizadas, usuario.id, ahora) : 0
  const disponible = Math.max(0, plan.horasGratisMes * HORA - usado)
  const ahorro = finalizadas
    .filter((s) => s.clienteId === usuario?.id)
    .reduce((total, s) => total + ((s.subtotal ?? s.total) - s.total), 0)
  const dias = diasRestantes(membresia, ahora)
  const progreso = Math.min(100, Math.round(((DURACION_DIAS - dias) / DURACION_DIAS) * 100))

  return (
    <section className="pagina">
      <Encabezado titulo="Mi membresía" subtitulo="Tu plan y sus beneficios" />

      <div className={`mi-plan mi-plan-${plan.id}`}>
        <div className="mi-plan-cabecera">
          <div>
            <span className="mi-plan-etiqueta">Tu plan</span>
            <h2>{plan.nombre}</h2>
          </div>
          <span className={`estado membresia-${estado}`}>{TEXTO_ESTADO[estado]}</span>
        </div>
        <p>
          {estado === 'vencida' ? 'Venció el ' : 'Vence el '}
          <strong>{formatearFecha(membresia.vence)}</strong>
          {estado !== 'vencida' && ` · te quedan ${dias} ${dias === 1 ? 'día' : 'días'}`}
        </p>
        <div
          className="barra"
          role="progressbar"
          aria-label="Días usados de la membresía"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progreso}%` }} />
        </div>
        {estado !== 'activa' && (
          <p className="mi-plan-aviso">
            {estado === 'vencida'
              ? 'Tus beneficios están pausados. Renueva en caja para recuperarlos.'
              : 'Tu membresía vence pronto. Renuévala en caja para no perder tus beneficios.'}
          </p>
        )}
      </div>

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>
            <Clock size={15} aria-hidden="true" /> Horas gratis este mes
          </span>
          <strong>{plan.horasGratisMes > 0 ? formatearHorasMin(disponible) : '—'}</strong>
          {plan.horasGratisMes > 0 && <span>de {plan.horasGratisMes} h disponibles</span>}
        </div>
        <div className="tarjeta dato">
          <span>
            <Percent size={15} aria-hidden="true" /> Descuento en mesa
          </span>
          <strong>{plan.descuentoMesa}%</strong>
        </div>
        <div className="tarjeta dato dato-verde">
          <span>
            <PiggyBank size={15} aria-hidden="true" /> Has ahorrado
          </span>
          <strong>{formatearPesos(ahorro)}</strong>
        </div>
      </div>

      {comparativa}
    </section>
  )
}
