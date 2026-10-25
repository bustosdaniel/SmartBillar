import { useState } from 'react'
import { Tags } from 'lucide-react'
import { useEsAdministrador } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { useAhora } from '../../hooks/useAhora'
import { mesasMock, NOMBRES_MODO } from '../../mesas/datos'
import { useCalculadoraCuenta } from '../../mesas/cuenta'
import { detenerSesion, estadoMesa, useSesiones } from '../../mesas/sesiones'
import type { Mesa, ModoJuego, Sesion } from '../../types'
import { formatearPesos } from '../../utils/formato'
import { DialogoConsumo } from './consumos/DialogoConsumo'
import { DialogoCobrar } from './mesas/DialogoCobrar'
import { DialogoIniciar } from './mesas/DialogoIniciar'
import { DialogoTarifas } from './mesas/DialogoTarifas'
import { TarjetaMesa } from './mesas/TarjetaMesa'

type Filtro = ModoJuego | 'todas'
type Dialogo =
  | { tipo: 'iniciar'; mesa: Mesa }
  | { tipo: 'cobrar'; mesa: Mesa; sesion: Sesion }
  | { tipo: 'consumo'; mesa: Mesa }
  | { tipo: 'tarifas' }
  | null

const TITULOS = {
  iniciar: 'Iniciar sesión de juego',
  cobrar: 'Finalizar y cobrar',
  consumo: 'Agregar consumo',
  tarifas: 'Tarifas',
}

const filtros: Filtro[] = ['todas', 'pool', 'tres-bandas', 'libre']

export function Mesas() {
  const esAdministrador = useEsAdministrador()
  const sesiones = useSesiones()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const calcular = useCalculadoraCuenta()

  const estados = mesasMock.map((m) => estadoMesa(sesiones[m.id]))
  const cuentas = new Map(
    mesasMock.flatMap((m) => {
      const sesion = sesiones[m.id]
      return sesion ? [[m.id, calcular(sesion, m, ahora)] as const] : []
    }),
  )
  const enCurso = [...cuentas.values()].reduce((total, c) => total + c.total, 0)
  const visibles = filtro === 'todas' ? mesasMock : mesasMock.filter((m) => m.modo === filtro)

  const cerrar = () => setDialogo(null)

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Mesas" subtitulo="Control de mesas en tiempo real" />
        {esAdministrador && (
          <button type="button" className="boton boton-secundario" onClick={() => setDialogo({ tipo: 'tarifas' })}>
            <Tags size={16} aria-hidden="true" /> Tarifas
          </button>
        )}
      </header>

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Disponibles</span>
          <strong>{estados.filter((e) => e === 'libre').length}</strong>
        </div>
        <div className="tarjeta dato dato-verde">
          <span>En uso</span>
          <strong>{estados.filter((e) => e === 'en-uso').length}</strong>
        </div>
        <div className="tarjeta dato dato-ambar">
          <span>Pausadas / por cobrar</span>
          <strong>{estados.filter((e) => e === 'pausada' || e === 'por-cobrar').length}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Por cobrar en curso</span>
          <strong>{formatearPesos(enCurso)}</strong>
        </div>
      </div>

      <div className="filtros" role="group" aria-label="Filtrar por modo de juego">
        {filtros.map((f) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? 'activo' : ''}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {f === 'todas' ? 'Todas' : NOMBRES_MODO[f]}
          </button>
        ))}
      </div>

      <div className="grid-mesas">
        {visibles.map((mesa) => (
          <TarjetaMesa
            key={mesa.id}
            mesa={mesa}
            sesion={sesiones[mesa.id]}
            ahora={ahora}
            cuenta={cuentas.get(mesa.id) ?? null}
            onIniciar={() => setDialogo({ tipo: 'iniciar', mesa })}
            onConsumo={() => setDialogo({ tipo: 'consumo', mesa })}
            onFinalizar={() => {
              const sesion = detenerSesion(mesa.id)
              if (sesion) setDialogo({ tipo: 'cobrar', mesa, sesion })
            }}
          />
        ))}
      </div>

      <Modal
        abierto={dialogo !== null}
        titulo={dialogo ? TITULOS[dialogo.tipo] : ''}
        onCerrar={cerrar}
      >
        {dialogo?.tipo === 'iniciar' && <DialogoIniciar mesa={dialogo.mesa} onListo={cerrar} />}
        {dialogo?.tipo === 'tarifas' && <DialogoTarifas onListo={cerrar} />}
        {dialogo?.tipo === 'consumo' && <DialogoConsumo mesa={dialogo.mesa} onListo={cerrar} />}
        {dialogo?.tipo === 'cobrar' && (
          <DialogoCobrar mesa={dialogo.mesa} sesion={dialogo.sesion} onListo={cerrar} />
        )}
      </Modal>
    </section>
  )
}
