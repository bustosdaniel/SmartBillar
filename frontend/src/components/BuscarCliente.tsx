import { useState, type FormEvent } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { buscarPorCedula } from '../auth/usuarios'
import { useAhora } from '../hooks/useAhora'
import { planVigente, useMembresias, usePlanes } from '../membresias/membresias'
import { DialogoRegistrarCliente } from '../pages/admin/usuarios/DialogoRegistrarCliente'
import type { Usuario } from '../types'

type BuscarClienteProps = {
  cliente: Usuario | null
  onCambio: (cliente: Usuario | null) => void
  mensajeEncontrado?: string
}

// Flujo del diagrama: "Ingrese número de cédula" → encontrado, o "intente de nuevo" / registrarlo ahí mismo.
export function BuscarCliente({ cliente, onCambio, mensajeEncontrado = 'Cliente encontrado, buen juego.' }: BuscarClienteProps) {
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()
  const [cedula, setCedula] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  function buscar(e: FormEvent) {
    e.preventDefault()
    const encontrado = buscarPorCedula(cedula)
    setNoEncontrado(!encontrado)
    onCambio(encontrado)
  }

  if (registrando) {
    return (
      <div className="buscar-cliente">
        <h3 className="titulo-bloque">Registrar nuevo cliente</h3>
        <DialogoRegistrarCliente
          cedulaInicial={cedula}
          onListo={() => setRegistrando(false)}
          onRegistrado={(nuevo) => {
            setRegistrando(false)
            setNoEncontrado(false)
            onCambio(nuevo)
          }}
        />
      </div>
    )
  }

  if (cliente) {
    const plan = planVigente(membresias, planes, cliente.id, ahora)
    return (
      <div className="cliente-encontrado" role="status">
        <div>
          <strong>
            {cliente.nombre}
            {plan && <span className={`insignia-plan insignia-${plan.id} insignia-chica`}>{plan.nombre}</span>}
          </strong>
          <span className="texto-suave">
            C.C. {cliente.cedula} · {cliente.email}
          </span>
          <span className="cliente-encontrado-mensaje">{mensajeEncontrado}</span>
        </div>
        <button
          type="button"
          className="boton-icono boton-icono-claro"
          aria-label="Buscar otro cliente"
          onClick={() => {
            onCambio(null)
            setCedula('')
          }}
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="buscar-cliente">
      <form className="buscar-cliente-fila" onSubmit={buscar}>
        <label>
          Cédula del cliente
          <input
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value)
              setNoEncontrado(false)
            }}
            inputMode="numeric"
            placeholder="Ej. 1098765432"
            autoFocus
            required
          />
        </label>
        <button type="submit" className="boton">
          <Search size={16} aria-hidden="true" /> Buscar
        </button>
      </form>
      {noEncontrado && (
        <div className="aviso-claro aviso-ambar aviso-con-accion" role="alert">
          <span>No se encontró al cliente, intente de nuevo o regístrelo.</span>
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => setRegistrando(true)}>
            <UserPlus size={15} aria-hidden="true" /> Registrar
          </button>
        </div>
      )}
    </div>
  )
}
