import { useState, type FormEvent } from 'react'
import { Clock, Hash } from 'lucide-react'
import { listarClientes } from '../../../auth/usuarios'
import { useAhora } from '../../../hooks/useAhora'
import { NOMBRES_MODO } from '../../../mesas/datos'
import { iniciarSesion } from '../../../mesas/sesiones'
import { preciosAl, textoAjuste, useTarifas } from '../../../mesas/tarifas'
import type { Mesa, ModoCobro } from '../../../types'
import { formatearPesos } from '../../../utils/formato'

const SIN_CUENTA = 'sin-cuenta'

export function DialogoIniciar({ mesa, onListo }: { mesa: Mesa; onListo: () => void }) {
  const [clientes] = useState(listarClientes)
  const [seleccion, setSeleccion] = useState(String(clientes[0]?.id ?? SIN_CUENTA))
  const [modoCobro, setModoCobro] = useState<ModoCobro>('tiempo')
  const config = useTarifas()
  const ahora = useAhora()
  const precios = preciosAl(config, mesa.modo, ahora)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    // Los precios se toman en el momento exacto de entregar las bolas.
    const { hora, partida, regla } = preciosAl(config, mesa.modo, Date.now())
    const cobro = { modoCobro, tarifaHora: hora, precioPartida: partida, regla: regla?.nombre ?? null }
    if (seleccion === SIN_CUENTA) {
      iniciarSesion(mesa.id, { id: null, nombre: String(datos.get('nombre')).trim() }, cobro)
    } else {
      const cliente = clientes.find((c) => String(c.id) === seleccion)
      if (!cliente) return
      iniciarSesion(mesa.id, { id: cliente.id, nombre: cliente.nombre }, cobro)
    }
    onListo()
  }

  return (
    <form className="formulario-claro" onSubmit={handleSubmit}>
      <p className="texto-suave">
        {mesa.nombre} · {NOMBRES_MODO[mesa.modo]}
      </p>
      <label>
        Cliente
        <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.email})
            </option>
          ))}
          <option value={SIN_CUENTA}>Cliente sin cuenta</option>
        </select>
      </label>
      {seleccion === SIN_CUENTA && (
        <label>
          Nombre del cliente
          <input name="nombre" required autoFocus />
        </label>
      )}

      <fieldset className="metodos metodos-dos">
        <legend>¿Cómo se cobra?</legend>
        <button
          type="button"
          className={modoCobro === 'tiempo' ? 'activo' : ''}
          aria-pressed={modoCobro === 'tiempo'}
          onClick={() => setModoCobro('tiempo')}
        >
          <Clock size={20} aria-hidden="true" />
          Por tiempo
          <strong>{formatearPesos(precios.hora)}/h</strong>
        </button>
        <button
          type="button"
          className={modoCobro === 'partida' ? 'activo' : ''}
          aria-pressed={modoCobro === 'partida'}
          onClick={() => setModoCobro('partida')}
        >
          <Hash size={20} aria-hidden="true" />
          Por partida
          <strong>{formatearPesos(precios.partida)} c/u</strong>
        </button>
      </fieldset>

      {precios.regla && (
        <p className={`aviso-claro ${precios.regla.ajuste > 0 ? 'aviso-ambar' : ''}`}>
          Ahora aplica <strong>{precios.regla.nombre}</strong> ({textoAjuste(precios.regla.ajuste)}). Los precios quedan fijos
          para esta sesión.
        </p>
      )}

      <p className="nota">
        {modoCobro === 'tiempo'
          ? 'El tiempo empieza a contar en cuanto confirmes la entrega de las bolas.'
          : 'Se cuenta la primera partida al entregar las bolas; suma las siguientes desde la tarjeta de la mesa.'}
      </p>
      <button type="submit" className="boton">
        Entregar bolas e iniciar
      </button>
    </form>
  )
}
