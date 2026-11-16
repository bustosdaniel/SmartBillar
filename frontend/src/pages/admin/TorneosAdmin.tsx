import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { useEsAdministrador } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { TarjetaTorneo } from '../../components/TarjetaTorneo'
import { ORDEN_ESTADO_TORNEO, useTorneos } from '../../torneos/torneos'
import { DialogoCrearTorneo } from './torneos/DialogoCrearTorneo'

export function TorneosAdmin() {
  const esAdministrador = useEsAdministrador()
  const torneos = useTorneos()
  const navigate = useNavigate()
  const [creando, setCreando] = useState(false)

  const lista = torneos.toSorted(
    (a, b) => ORDEN_ESTADO_TORNEO[a.estado] - ORDEN_ESTADO_TORNEO[b.estado] || a.fecha.localeCompare(b.fecha),
  )

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Torneos" subtitulo="Organización de torneos del club" />
        {esAdministrador && (
          <button type="button" className="boton" onClick={() => setCreando(true)}>
            <Plus size={18} aria-hidden="true" /> Crear torneo
          </button>
        )}
      </header>

      <div className="grid-torneos">
        {lista.map((t) => (
          <TarjetaTorneo key={t.id} torneo={t}>
            <Link to={`/admin/torneos/${t.id}`} className="boton boton-secundario boton-chico">
              {t.estado === 'inscripciones' || t.estado === 'cancelado' ? 'Gestionar' : 'Ver llaves'}
            </Link>
          </TarjetaTorneo>
        ))}
      </div>

      <Modal abierto={creando} titulo="Crear torneo" onCerrar={() => setCreando(false)}>
        <DialogoCrearTorneo
          onListo={(id) => {
            setCreando(false)
            navigate(`/admin/torneos/${id}`)
          }}
        />
      </Modal>
    </section>
  )
}
