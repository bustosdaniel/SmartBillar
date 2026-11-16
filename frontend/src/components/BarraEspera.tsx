import { useEsperando } from '../api/espera'

// Barra delgada arriba de la pantalla mientras se espera al backend. El CSS la hace aparecer solo si
// tarda más de un instante, para que las respuestas rápidas no hagan parpadear la pantalla.
export function BarraEspera() {
  const esperando = useEsperando()
  return (
    <div className={`barra-espera ${esperando ? 'visible' : ''}`} role="progressbar" aria-label="Procesando" aria-hidden={!esperando}>
      <span />
    </div>
  )
}
