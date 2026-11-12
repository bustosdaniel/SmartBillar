import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { buscarPorEmail, recordarUsuario, sugerirClientes } from '../auth/usuarios'
import { useAhora } from '../hooks/useAhora'
import { planVigente, useMembresias, usePlanes } from '../membresias/membresias'
import { DialogoRegistrarCliente } from '../pages/admin/usuarios/DialogoRegistrarCliente'
import type { Usuario } from '../types'

type BuscarClienteProps = {
  cliente: Usuario | null
  onCambio: (cliente: Usuario | null) => void
  mensajeEncontrado?: string
}

const MINIMO_SUGERENCIAS = 2
const ESPERA_SUGERENCIAS_MS = 250

// El cliente se identifica por su correo: mientras se escribe se sugieren correos (o nombres) que
// contienen el texto, para elegir sin escribirlo completo. Si no aparece, "intente de nuevo" o registrarlo.
export function BuscarCliente({ cliente, onCambio, mensajeEncontrado = 'Cliente encontrado, buen juego.' }: BuscarClienteProps) {
  const membresias = useMembresias()
  const planes = usePlanes()
  const ahora = useAhora()
  const [email, setEmail] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  // Las sugerencias quedan atadas al texto que las pidió: si el texto cambió, no se muestran las viejas.
  const [sugeridas, setSugeridas] = useState<{ texto: string; clientes: Usuario[] } | null>(null)
  const [activa, setActiva] = useState(-1)
  const [cerradas, setCerradas] = useState(false)

  const texto = email.trim()
  const sugerencias = !cerradas && sugeridas?.texto === texto ? sugeridas.clientes : []

  useEffect(() => {
    if (texto.length < MINIMO_SUGERENCIAS) return
    let vigente = true
    const espera = setTimeout(() => {
      sugerirClientes(texto)
        .then((clientes) => {
          if (!vigente) return
          setSugeridas({ texto, clientes })
          setActiva(-1)
        })
        .catch(() => {}) // Sin sugerencias sigue funcionando la búsqueda exacta.
    }, ESPERA_SUGERENCIAS_MS)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto])

  function elegir(elegido: Usuario) {
    recordarUsuario(elegido)
    setNoEncontrado(false)
    setError('')
    onCambio(elegido)
  }

  function moverConTeclado(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && sugerencias.length > 0) {
      e.preventDefault()
      setCerradas(true)
      return
    }
    if (sugerencias.length === 0 || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    // Recorre -1 (el texto escrito, sin marcar ninguna) y luego cada sugerencia, dando la vuelta.
    const paso = e.key === 'ArrowDown' ? 1 : -1
    setActiva((i) => {
      const siguiente = i + paso
      if (siguiente >= sugerencias.length) return -1
      if (siguiente < -1) return sugerencias.length - 1
      return siguiente
    })
  }

  async function buscar(e: FormEvent) {
    e.preventDefault()
    // Enter sobre una sugerencia marcada la elige.
    if (activa >= 0 && sugerencias[activa]) {
      elegir(sugerencias[activa])
      return
    }
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
            type="text"
            inputMode="email"
            role="combobox"
            aria-expanded={sugerencias.length > 0}
            aria-controls="sugerencias-cliente"
            aria-autocomplete="list"
            aria-activedescendant={activa >= 0 ? `sugerencia-cliente-${activa}` : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setNoEncontrado(false)
              setError('')
              setCerradas(false)
              setActiva(-1)
            }}
            onKeyDown={moverConTeclado}
            autoComplete="off"
            spellCheck={false}
            placeholder="Escribe parte del correo o del nombre"
            autoFocus
            required
          />
        </label>
        <button type="submit" className="boton" disabled={buscando}>
          <Search size={16} aria-hidden="true" /> {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {sugerencias.length > 0 && (
        <ul id="sugerencias-cliente" role="listbox" className="sugerencias-cliente" aria-label="Clientes parecidos">
          {sugerencias.map((c, i) => (
            <li
              key={c.id}
              id={`sugerencia-cliente-${i}`}
              role="option"
              aria-selected={i === activa}
              className={i === activa ? 'activa' : ''}
              // mousedown en vez de click: elige antes de que el campo pierda el foco.
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(c)
              }}
              onMouseEnter={() => setActiva(i)}
            >
              <strong>{c.email}</strong>
              <span className="texto-suave">{c.nombre}</span>
            </li>
          ))}
        </ul>
      )}
      {texto.length >= MINIMO_SUGERENCIAS && sugeridas?.texto === texto && sugeridas.clientes.length === 0 && !noEncontrado && (
        <p className="nota">Ningún cliente coincide con «{texto}».</p>
      )}
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
