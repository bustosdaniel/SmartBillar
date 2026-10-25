import { useState, type FormEvent } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { buscarPorEmail } from '../auth/usuarios'
import { useAhora } from '../hooks/useAhora'
import { planVigente, useMembresias, usePlanes } from '../membresias/membresias'
import { DialogoRegistrarCliente } from '../pages/admin/usuarios/DialogoRegistrarCliente'
import type { Usuario } from '../types'

type BuscarClienteProps = {
  cliente: Usuario | null
  onCambio: (cliente: Usuario | null) => void
  mensajeEncontrado?: string
}

// El cliente se identifica por su correo: encontrado, o "intente de nuevo" / registrarlo ahí mismo.
export function BuscarCliente({ cliente, onCambio, mensajeEncontrado = 'Cliente encontrado, buen juego.' }: BuscarClienteProps) {
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()
  const [email, setEmail] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setError('')
    try {
      const encontrado = await buscarPorEmail(email)
      setNoEncontrado(!encontrado)
      onCambio(encontrado)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar al cliente.')
    } finally {
      setBuscando(false)
    }
  }

  if (registrando) {
    return (
      <div className="buscar-cliente">
        <h3 className="titulo-bloque">Registrar nuevo cliente</h3>
        <DialogoRegistrarCliente
          emailInicial={email}
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
            {cliente.email}
            {cliente.telefono && ` · ${cliente.telefono}`}
          </span>
          <span className="cliente-encontrado-mensaje">{mensajeEncontrado}</span>
        </div>
        <button
          type="button"
          className="boton-icono boton-icono-claro"
          aria-label="Buscar otro cliente"
          onClick={() => {
            onCambio(null)
            setEmail('')
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
          Correo del cliente
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setNoEncontrado(false)
              setError('')
            }}
            autoComplete="off"
            placeholder="Ej. cliente@correo.com"
            autoFocus
            required
          />
        </label>
        <button type="submit" className="boton" disabled={buscando}>
          <Search size={16} aria-hidden="true" /> {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}
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
