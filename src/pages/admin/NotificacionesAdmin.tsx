import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Encabezado } from '../../components/Encabezado'
import { IconoNotificacion } from '../../components/IconoNotificacion'
import { NOMBRES_TIPO, useNotificaciones } from '../../notificaciones/notificaciones'
import type { TipoNotificacion } from '../../types'
import { formatearFecha, formatearHora } from '../../utils/formato'

type Filtro = TipoNotificacion | 'todas'
const FILTROS: Filtro[] = ['todas', 'factura', 'membresia', 'torneo', 'cuenta']

export function NotificacionesAdmin() {
  const todas = useNotificaciones()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const lista = filtro === 'todas' ? todas : todas.filter((n) => n.tipo === filtro)

  return (
    <section className="pagina">
      <Encabezado titulo="Notificaciones" subtitulo="Correos que el sistema envía a los clientes" />

      <p className="aviso-claro aviso-azul">
        <Mail size={18} aria-hidden="true" /> Por ahora los correos son simulados: aquí queda lo que se enviaría. El envío
        real lo hará el backend.
      </p>

      <div className="filtros" role="group" aria-label="Filtrar por tipo">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? 'activo' : ''}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {f === 'todas' ? `Todas (${todas.length})` : `${NOMBRES_TIPO[f]} (${todas.filter((n) => n.tipo === f).length})`}
          </button>
        ))}
      </div>

      <div className="tarjeta panel-bloque">
        {lista.length === 0 ? (
          <p className="texto-suave">Todavía no se ha enviado ningún correo de este tipo.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Para</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((n) => (
                  <tr key={n.id}>
                    <td>
                      {formatearFecha(n.fecha)}
                      <span className="texto-suave"> · {formatearHora(n.fecha)}</span>
                    </td>
                    <td>
                      <strong>{n.nombre}</strong>
                      <br />
                      <span className="texto-suave">{n.email}</span>
                    </td>
                    <td className="celda-asunto">
                      <span className="asunto-fila">
                        <IconoNotificacion tipo={n.tipo} />
                        <span>
                          <strong>{n.asunto}</strong>
                          <br />
                          <span className="texto-suave">{n.mensaje}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`estado ${n.leida ? 'membresia-activa' : 'estado-libre'}`}>
                        {n.leida ? 'Leído' : 'Enviado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
