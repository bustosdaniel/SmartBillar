import { useState } from 'react'
import { Pencil, Plus, RefreshCw } from 'lucide-react'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { TarjetaPlan } from '../../components/TarjetaPlan'
import { useAhora } from '../../hooks/useAhora'
import {
  diasRestantes,
  estadoMembresia,
  cancelarSolicitud,
  PLAN_IDS,
  useMembresias,
  usePlanes,
  useSolicitudes,
} from '../../membresias/membresias'
import type { EstadoMembresia, Membresia, Plan, SolicitudMembresia } from '../../types'
import { formatearFecha, formatearHora, formatearPesos } from '../../utils/formato'
import { DialogoAsignar } from './membresias/DialogoAsignar'
import { DialogoEditarPlan } from './membresias/DialogoEditarPlan'

const TEXTO_ESTADO: Record<EstadoMembresia, string> = {
  activa: 'Activa',
  'por-vencer': 'Por vencer',
  vencida: 'Vencida',
}

type Dialogo =
  | { tipo: 'editar'; plan: Plan }
  | { tipo: 'asignar'; renovar?: Membresia; solicitud?: SolicitudMembresia }
  | null

export function Membresias() {
  const planes = usePlanes()
  const membresias = useMembresias()
  const solicitudes = Object.values(useSolicitudes()).filter((s) => s !== undefined)
  const ahora = useAhora()
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const lista = Object.values(membresias)
    .filter((m) => m !== undefined)
    .toSorted((a, b) => a.vence - b.vence)
  const miembrosActivos = (planId: string) =>
    lista.filter((m) => m.planId === planId && estadoMembresia(m, ahora) !== 'vencida').length

  const cerrar = () => setDialogo(null)
  const titulo =
    dialogo?.tipo === 'editar'
      ? `Editar plan ${dialogo.plan.nombre}`
      : dialogo?.solicitud
        ? 'Cobrar y activar membresía'
        : dialogo?.renovar
          ? 'Renovar membresía'
          : 'Asignar membresía'

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Membresías" subtitulo="Planes y suscripciones de los clientes" />
        <button type="button" className="boton" onClick={() => setDialogo({ tipo: 'asignar' })}>
          <Plus size={18} aria-hidden="true" /> Asignar membresía
        </button>
      </header>

      {solicitudes.length > 0 && (
        <div className="tarjeta panel-bloque solicitudes">
          <header className="panel-bloque-cabecera">
            <h2>Solicitudes pendientes de pago</h2>
            <span className="texto-suave">El cliente las pidió desde la app</span>
          </header>
          <ul className="movimientos">
            {solicitudes.map((s) => (
              <li key={s.clienteId}>
                <span className="movimiento-texto">
                  <strong>
                    {s.clienteNombre} <span className={`insignia-plan insignia-${s.planId} insignia-chica`}>{planes[s.planId].nombre}</span>
                  </strong>
                  <span>
                    {formatearFecha(s.fecha)} · {formatearHora(s.fecha)} · {formatearPesos(planes[s.planId].precioMensual)}
                  </span>
                </span>
                <div className="acciones-fila">
                  <button type="button" className="boton boton-secundario boton-chico" onClick={() => cancelarSolicitud(s.clienteId)}>
                    Rechazar
                  </button>
                  <button type="button" className="boton boton-chico" onClick={() => setDialogo({ tipo: 'asignar', solicitud: s })}>
                    Cobrar y activar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-planes">
        {PLAN_IDS.map((id) => (
          <TarjetaPlan
            key={id}
            plan={planes[id]}
            etiqueta={`${miembrosActivos(id)} ${miembrosActivos(id) === 1 ? 'miembro' : 'miembros'}`}
          >
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setDialogo({ tipo: 'editar', plan: planes[id] })}
            >
              <Pencil size={16} aria-hidden="true" /> Editar plan
            </button>
          </TarjetaPlan>
        ))}
      </div>

      <div className="tarjeta panel-bloque">
        <header className="panel-bloque-cabecera">
          <h2>Miembros</h2>
        </header>
        {lista.length === 0 ? (
          <p className="texto-suave">Aún no hay clientes con membresía.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Plan</th>
                  <th>Desde</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => {
                  const estado = estadoMembresia(m, ahora)
                  return (
                    <tr key={m.clienteId}>
                      <td>{m.clienteNombre}</td>
                      <td>
                        <span className={`insignia-plan insignia-${m.planId}`}>{planes[m.planId].nombre}</span>
                      </td>
                      <td>{formatearFecha(m.inicio)}</td>
                      <td>
                        {formatearFecha(m.vence)}
                        {estado !== 'vencida' && <span className="texto-suave"> · {diasRestantes(m, ahora)} días</span>}
                      </td>
                      <td>
                        <span className={`estado membresia-${estado}`}>{TEXTO_ESTADO[estado]}</span>
                      </td>
                      <td className="numero">
                        <button
                          type="button"
                          className="boton boton-secundario boton-chico"
                          onClick={() => setDialogo({ tipo: 'asignar', renovar: m })}
                        >
                          <RefreshCw size={14} aria-hidden="true" /> Renovar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal abierto={dialogo !== null} titulo={titulo} onCerrar={cerrar}>
        {dialogo?.tipo === 'editar' && <DialogoEditarPlan plan={dialogo.plan} onListo={cerrar} />}
        {dialogo?.tipo === 'asignar' && (
          <DialogoAsignar renovar={dialogo.renovar} solicitud={dialogo.solicitud} onListo={cerrar} />
        )}
      </Modal>
    </section>
  )
}
