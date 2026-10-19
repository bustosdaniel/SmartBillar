import { Receipt, CreditCard, KeyRound, Trophy, type LucideIcon } from 'lucide-react'
import type { TipoNotificacion } from '../types'

const ICONOS: Record<TipoNotificacion, LucideIcon> = {
  factura: Receipt,
  membresia: CreditCard,
  torneo: Trophy,
  cuenta: KeyRound,
}

export function IconoNotificacion({ tipo }: { tipo: TipoNotificacion }) {
  const Icono = ICONOS[tipo]
  return (
    <span className={`notif-icono notif-${tipo}`}>
      <Icono size={18} aria-hidden="true" />
    </span>
  )
}
