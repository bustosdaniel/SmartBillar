import { useState } from 'react'
import { useNavigate } from 'react-router'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { eliminarTorneo, formatearFechaTorneo } from '../../../torneos/torneos'
import type { Torneo } from '../../../types'

export function DialogoEliminarTorneo({ torneo, onListo }: { torneo: Torneo; onListo: () => void }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function confirmar() {
    setError('')
    try {
      await eliminarTorneo(torneo.id)
      navigate('/admin/torneos', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el torneo.')
    }
  }

  return (
    <div className="formulario-claro">
      <p>
        Se eliminará <strong>{torneo.nombre}</strong> ({NOMBRES_MODO[torneo.modo]} · {formatearFechaTorneo(torneo)}). Esto no se
        puede deshacer; si te equivocaste en algún dato, crea el torneo de nuevo con los datos correctos.
      </p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <div className="dialogo-acciones">
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        <button type="button" className="boton boton-peligro" onClick={confirmar}>
          Eliminar torneo
        </button>
      </div>
    </div>
  )
}
