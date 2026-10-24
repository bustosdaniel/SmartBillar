import { useState } from 'react'
import { BuscarCliente } from '../../../components/BuscarCliente'
import { useAhora } from '../../../hooks/useAhora'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { iniciarSesion } from '../../../mesas/sesiones'
import { preciosAl, textoAjuste, useTarifas } from '../../../mesas/tarifas'
import type { Mesa, Usuario } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

// No es un <form>: la búsqueda por cédula y el registro rápido llevan sus propios formularios.
export function DialogoIniciar({ mesa, onListo }: { mesa: Mesa; onListo: () => void }) {
  const [cliente, setCliente] = useState<Usuario | null>(null)
  const config = useTarifas()
  const ahora = useAhora()
  const precios = preciosAl(config, mesa.modo, ahora)

  function iniciar() {
    if (!cliente) return
    // La tarifa se toma en el momento exacto de entregar las bolas.
    const { hora, regla } = preciosAl(config, mesa.modo, Date.now())
    iniciarSesion(mesa.id, { id: cliente.id, nombre: cliente.nombre }, { tarifaHora: hora, regla: regla?.nombre ?? null })
    onListo()
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
      <button type="button" className="boton" disabled={!cliente} onClick={iniciar}>
        Entregar bolas e iniciar
      </button>
    </div>
  )
}
