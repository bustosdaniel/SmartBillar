import { useState } from 'react'
import { BuscarCliente } from '../../../components/BuscarCliente'
import { useAhora } from '../../../hooks/useAhora'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { iniciarSesion } from '../../../mesas/sesiones'
import { preciosAl, textoAjuste, useTarifas } from '../../../mesas/tarifas'
import type { Mesa, Usuario } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

// No es un <form>: la búsqueda del cliente y el registro rápido llevan sus propios formularios.
export function DialogoIniciar({ mesa, onListo }: { mesa: Mesa; onListo: () => void }) {
  const [cliente, setCliente] = useState<Usuario | null>(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const config = useTarifas()
  const ahora = useAhora()
  const precios = preciosAl(config, mesa.modo, ahora)

  // La tarifa la fija el backend en el momento exacto de entregar las bolas.
  async function iniciar() {
    if (!cliente || enviando) return
    setEnviando(true)
    setError('')
    try {
      await iniciarSesion(mesa.id, cliente.id)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la mesa.')
      setEnviando(false)
    }
  }

  return (
    <div className="formulario-claro">
      <p className="texto-suave">
        {mesa.nombre} · {NOMBRES_MODO[mesa.modo]} · <strong>{formatearPesos(precios.hora)}/h</strong>
      </p>

      <BuscarCliente cliente={cliente} onCambio={setCliente} />

      {precios.regla && (
        <p className={`aviso-claro ${precios.regla.ajuste > 0 ? 'aviso-ambar' : ''}`}>
          Ahora aplica <strong>{precios.regla.nombre}</strong> ({textoAjuste(precios.regla.ajuste)}). La tarifa queda fija
          para esta sesión.
        </p>
      )}

      <p className="nota">El tiempo empieza a contar en cuanto confirmes la entrega de las bolas.</p>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
      <button type="button" className="boton" disabled={!cliente || enviando} onClick={iniciar}>
        {enviando ? 'Iniciando…' : 'Entregar bolas e iniciar'}
      </button>
    </div>
  )
}
