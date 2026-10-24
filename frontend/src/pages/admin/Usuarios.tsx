import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import {
  cambiarCargo,
  NOMBRES_CARGO,
  normalizar,
  useCargos,
  useUsuarios,
} from '../../auth/usuarios'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { useAhora } from '../../hooks/useAhora'
import { useSesionesFinalizadas } from '../../mesas/sesiones'
import { estadoMembresia, planVigente, useMembresias, usePlanes } from '../../membresias/membresias'
import { useTorneos } from '../../torneos/torneos'
import type { Cargo, Usuario } from '../../types'
import { formatearFecha, formatearPesos } from '../../utils/formato'
import { DialogoRegistrarCliente } from './usuarios/DialogoRegistrarCliente'
import { FichaCliente } from './usuarios/FichaCliente'

type Pestana = 'clientes' | 'empleados'
const CARGOS: Cargo[] = ['administrador', 'cajero']

export function Usuarios() {
  const cargos = useCargos()
  const finalizadas = useSesionesFinalizadas()
  const membresias = useMembresias()
  const planes = usePlanes()
  const torneos = useTorneos()
  const ahora = useAhora()
  const [pestana, setPestana] = useState<Pestana>('clientes')
  const [busqueda, setBusqueda] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [ficha, setFicha] = useState<Usuario | null>(null)

  const usuarios = useUsuarios()
  const empleados = usuarios.filter((u) => u.rol === 'admin')
  const termino = normalizar(busqueda.trim())

  const clientes = usuarios
    .filter((u) => u.rol === 'cliente')
    .filter((u) => !termino || [u.nombre, u.email, u.telefono ?? '', u.cedula ?? ''].some((c) => normalizar(c).includes(termino)))
    .map((u) => {
      const partidas = finalizadas.filter((s) => s.clienteId === u.id)
      const ultima = partidas.reduce((max, s) => Math.max(max, s.fin), 0)
      return {
        usuario: u,
        partidas,
        ultima,
        gastado: partidas.reduce((t, s) => t + s.total, 0),
        membresia: membresias[u.id],
      }
    })
    .toSorted((a, b) => b.ultima - a.ultima || a.usuario.nombre.localeCompare(b.usuario.nombre))

  const fichaDatos = ficha && clientes.find((c) => c.usuario.id === ficha.id)

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Usuarios" subtitulo="Clientes del club y personal" />
        {pestana === 'clientes' && (
          <button type="button" className="boton" onClick={() => setRegistrando(true)}>
            <UserPlus size={18} aria-hidden="true" /> Registrar cliente
          </button>
        )}
      </header>

      <div className="filtros" role="tablist" aria-label="Tipo de usuario">
        {(['clientes', 'empleados'] as Pestana[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={pestana === p}
            className={pestana === p ? 'activo' : ''}
            onClick={() => setPestana(p)}
          >
            {p === 'clientes' ? `Clientes (${usuarios.filter((u) => u.rol === 'cliente').length})` : `Empleados (${empleados.length})`}
          </button>
        ))}
      </div>

      {pestana === 'clientes' ? (
        <div className="tarjeta panel-bloque">
          <label className="buscador">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar cliente</span>
            <input
              type="search"
              placeholder="Buscar por nombre, correo, celular o cédula"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          {clientes.length === 0 ? (
            <p className="texto-suave">No hay clientes que coincidan con “{busqueda}”.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla tabla-clicable">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cédula</th>
                    <th>Celular</th>
                    <th>Membresía</th>
                    <th className="numero">Visitas</th>
                    <th>Última visita</th>
                    <th className="numero">Gastado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(({ usuario, partidas, ultima, gastado, membresia }) => {
                    const vigente = membresia && estadoMembresia(membresia, ahora) !== 'vencida'
                    return (
                      <tr key={usuario.id}>
                        <td>
                          <button type="button" className="enlace-fila" onClick={() => setFicha(usuario)}>
                            <span className="avatar avatar-chico" aria-hidden="true">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </span>
                            <span>
                              <strong>{usuario.nombre}</strong>
                              <span className="texto-suave">{usuario.email}</span>
                            </span>
                          </button>
                        </td>
                        <td>{usuario.cedula ?? '—'}</td>
                        <td>{usuario.telefono ?? '—'}</td>
                        <td>
                          {membresia && vigente ? (
                            <span className={`insignia-plan insignia-${membresia.planId}`}>{planes[membresia.planId].nombre}</span>
                          ) : (
                            <span className="texto-suave">{membresia ? 'Vencida' : '—'}</span>
                          )}
                        </td>
                        <td className="numero">{partidas.length}</td>
                        <td>{ultima ? formatearFecha(ultima) : <span className="texto-suave">Nunca</span>}</td>
                        <td className="numero">{formatearPesos(gastado)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="tarjeta panel-bloque">
          <ul className="empleados">
            {empleados.map((u) => {
              const cargo = cargos[u.id] ?? u.cargo ?? 'administrador'
              return (
                <li key={u.id}>
                  <span className="avatar" aria-hidden="true">
                    {u.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="movimiento-texto">
                    <strong>{u.nombre}</strong>
                    <span>{u.email}</span>
                  </span>
                  <label className="selector-cargo">
                    <span className="sr-only">Cargo de {u.nombre}</span>
                    <select value={cargo} onChange={(e) => cambiarCargo(u.id, e.target.value as Cargo)}>
                      {CARGOS.map((c) => (
                        <option key={c} value={c}>
                          {NOMBRES_CARGO[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="nota">
            Por ahora los dos cargos entran a la misma vista de administración. Qué puede hacer el Cajero / Operador está
            pendiente de definir con el equipo (G1).
          </p>
        </div>
      )}

      <Modal abierto={registrando} titulo="Registrar cliente" onCerrar={() => setRegistrando(false)}>
        <DialogoRegistrarCliente onListo={() => setRegistrando(false)} />
      </Modal>
      <Modal abierto={ficha !== null} titulo={ficha?.nombre ?? ''} onCerrar={() => setFicha(null)}>
        {fichaDatos && (
          <FichaCliente
            cliente={fichaDatos.usuario}
            partidas={fichaDatos.partidas}
            membresia={fichaDatos.membresia}
            plan={planVigente(membresias, planes, fichaDatos.usuario.id, ahora) ?? (fichaDatos.membresia ? planes[fichaDatos.membresia.planId] : null)}
            torneos={torneos.filter((t) => t.jugadores.some((j) => j.clienteId === fichaDatos.usuario.id))}
            ahora={ahora}
          />
        )}
      </Modal>
    </section>
  )
}
