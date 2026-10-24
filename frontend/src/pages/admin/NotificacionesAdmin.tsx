import { useState } from 'react'
import { CheckCheck, Mail } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { useUsuarios } from '../../auth/usuarios'
import { BandejaNotificaciones } from '../../components/BandejaNotificaciones'
import { Encabezado } from '../../components/Encabezado'
import { IconoNotificacion } from '../../components/IconoNotificacion'
import { marcarTodasLeidas, NOMBRES_TIPO, useNotificaciones } from '../../notificaciones/notificaciones'
import type { TipoNotificacion } from '../../types'
import { formatearFecha, formatearHora } from '../../utils/formato'

type Vista = 'mias' | 'correos'
type Filtro = TipoNotificacion | 'todas'
const FILTROS: Filtro[] = ['todas', 'factura', 'mesa', 'membresia', 'torneo', 'cuenta']

export function NotificacionesAdmin() {
  const { usuario } = useAuth()
  const todas = useNotificaciones()
  const usuarios = useUsuarios()
  const [vista, setVista] = useState<Vista>('mias')
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const mias = todas.filter((n) => n.usuarioId === usuario?.id)
  const sinLeer = mias.filter((n) => !n.leida).length
  // El registro de correos muestra solo lo que se envía a clientes, no los avisos entre administradores.
  const admins = new Set(usuarios.filter((u) => u.rol === 'admin').map((u) => u.id))
  const correos = todas.filter((n) => !admins.has(n.usuarioId))
  const lista = filtro === 'todas' ? correos : correos.filter((n) => n.tipo === filtro)

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado
          titulo="Notificaciones"
          subtitulo={vista === 'mias' ? (sinLeer > 0 ? `Tienes ${sinLeer} sin leer` : 'Estás al día') : 'Correos que el sistema envía a los clientes'}
        />
        {vista === 'mias' && sinLeer > 0 && usuario && (
          <button type="button" className="boton boton-secundario" onClick={() => marcarTodasLeidas(usuario.id)}>
            <CheckCheck size={16} aria-hidden="true" /> Marcar todas como leídas
          </button>
        )}
      </header>

      <div className="filtros" role="group" aria-label="Qué notificaciones ver">
        <button type="button" className={vista === 'mias' ? 'activo' : ''} aria-pressed={vista === 'mias'} onClick={() => setVista('mias')}>
          Mis notificaciones{sinLeer > 0 ? ` (${sinLeer})` : ''}
        </button>
        <button
          type="button"
          className={vista === 'correos' ? 'activo' : ''}
          aria-pressed={vista === 'correos'}
          onClick={() => setVista('correos')}
        >
          Correos a clientes ({correos.length})
        </button>
      </div>

      {vista === 'mias' ? (
        <BandejaNotificaciones
          notificaciones={mias}
          vacio="Aquí te avisamos cuando un cliente se inscribe o se retira de un torneo, pide o cancela una membresía, o crea su cuenta."
        />
      ) : (
        <>
          <p className="aviso-claro aviso-azul">
            <Mail size={18} aria-hidden="true" /> Por ahora los correos son simulados: aquí queda lo que se enviaría. El
            envío real lo hará el backend.
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
                {f === 'todas' ? `Todas (${correos.length})` : `${NOMBRES_TIPO[f]} (${correos.filter((n) => n.tipo === f).length})`}
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
        </>
      )}
    </section>
  )
}
