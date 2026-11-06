import { Link } from 'react-router'
import { ChevronRight, Sparkles, Timer, Trophy } from 'lucide-react'
import banner from '../../assets/images/image-principal.png'
import { useAuth } from '../../auth/useAuth'
import { useAhora } from '../../hooks/useAhora'
import { EQUIPO_MODO, MODOS, mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { IMAGEN_MODO } from '../../mesas/imagenes'
import { estadoMesa, sesionDelCliente, tiempoJugado, useSesiones } from '../../mesas/sesiones'
import { reglaVigente, textoAjuste, textoDias, useTarifas } from '../../mesas/tarifas'
import { formatearDuracion, formatearPesos } from '../../utils/formato'

const PASOS = [
  { titulo: 'Pide tu mesa en caja', texto: 'Dinos si quieres Pool, Tres Bandas o Libre.' },
  { titulo: 'Recibe las bolas', texto: 'Tu tiempo empieza justo cuando te las entregan.' },
  { titulo: 'Síguelo en Mi mesa', texto: 'Cronómetro y valor en vivo; pagas al terminar.' },
]

export function Inicio() {
  const { usuario } = useAuth()
  const nombre = usuario?.nombre.split(' ')[0]
  const tarifas = useTarifas()
  const ahora = useAhora()
  const promociones = tarifas.reglas.filter((r) => r.ajuste < 0)
  const recargos = tarifas.reglas.filter((r) => r.ajuste > 0)
  const vigente = reglaVigente(tarifas.reglas, ahora)

  return (
    <section className="pagina pagina-inicio-cliente">
      <div className="banner banner-compacto" style={{ backgroundImage: `url(${banner})` }}>
        <div className="banner-texto">
          <h1>Bienvenido, {nombre}</h1>
          <p>Juega en mesas de nivel profesional. Pide tu mesa en caja y sigue tu tiempo desde aquí.</p>
          <div className="banner-acciones">
            <Link to="/cliente/mesa" className="boton">
              <Timer size={16} aria-hidden="true" /> Ver mi mesa
            </Link>
            <Link to="/cliente/torneos" className="boton boton-vidrio">
              <Trophy size={16} aria-hidden="true" /> Torneos
            </Link>
          </div>
        </div>
        {promociones.map((r) => (
          <div key={r.id} className={`promo ${vigente?.id === r.id ? 'promo-activa' : ''}`}>
            <span className="promo-etiqueta">
              <Sparkles size={14} aria-hidden="true" /> {vigente?.id === r.id ? '¡Aplica ahora!' : 'Promoción'}
            </span>
            <strong className="promo-titulo">{r.nombre}</strong>
            <span className="promo-valor">{textoAjuste(r.ajuste)}</span>
            <span className="promo-detalle">
              en todas las mesas · {textoDias(r.dias)} de {r.desde} a {r.hasta}
            </span>
          </div>
        ))}
      </div>

      <MesaActiva clienteId={usuario?.id} />

      <ol className="pasos pasos-compactos" aria-label="Cómo jugar">
        {PASOS.map((p) => (
          <li key={p.titulo}>
            <strong>{p.titulo}</strong>
            <span>{p.texto}</span>
          </li>
        ))}
      </ol>

      <section className="panel-bloque">
        <div className="panel-bloque-cabecera">
          <h2 className="titulo-bloque">Nuestras mesas · alta gama</h2>
          {recargos.map((r) => (
            <span key={r.id} className="nota">
              {r.nombre}: {textoDias(r.dias)} de {r.desde} a {r.hasta} ({textoAjuste(r.ajuste)})
            </span>
          ))}
        </div>
        <div className="grid-modos">
          {MODOS.map((modo) => (
            <article key={modo} className="tarjeta modo modo-compacto">
              <div className="modo-foto-marco">
                <img src={IMAGEN_MODO[modo]} alt="" className="modo-foto" />
              </div>
              <div className="modo-texto">
                <div className="modo-cabecera">
                  <h3>{NOMBRES_MODO[modo]}</h3>
                  <strong>{formatearPesos(tarifas.porModo[modo].hora)}/h</strong>
                </div>
                <span className="modo-mesa">{EQUIPO_MODO[modo].mesa}</span>
                <span className="texto-suave modo-detalle">{EQUIPO_MODO[modo].detalle}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

// Aviso en el inicio cuando el cliente tiene una mesa corriendo.
function MesaActiva({ clienteId }: { clienteId: number | undefined }) {
  const sesion = sesionDelCliente(useSesiones(), clienteId)
  const ahora = useAhora()
  const mesa = sesion && mesasMock.find((m) => m.id === sesion.mesaId)
  if (!sesion || !mesa) return null

  return (
    <Link to="/cliente/mesa" className="mesa-activa">
      <Timer size={22} aria-hidden="true" />
      <span>
        Estás jugando en <strong>{mesa.nombre}</strong>
        {estadoMesa(sesion) === 'pausada' && ' (en pausa)'}
        {estadoMesa(sesion) === 'por-cobrar' && ' · tiempo terminado, pasa a caja'}
      </span>
      <strong className="mesa-activa-tiempo">{formatearDuracion(tiempoJugado(sesion, ahora))}</strong>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  )
}
