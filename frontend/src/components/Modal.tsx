import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

export function Modal({ abierto, titulo, onCerrar, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      {abierto && (
        <div className="modal-cuerpo">
          <header className="modal-cabecera">
            <h2>{titulo}</h2>
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
              <X size={20} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
