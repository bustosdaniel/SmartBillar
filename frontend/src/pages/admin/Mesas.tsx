import { useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { useEsAdministrador } from '../../auth/useAuth'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { useAhora } from '../../hooks/useAhora'
import { NOMBRES_MODO, useMesas } from '../../mesas/datos'
import { useCalculadoraCuenta } from '../../mesas/cuenta'
import { detenerSesion, estadoMesa, useSesiones } from '../../mesas/sesiones'
import type { Mesa, ModoJuego, Sesion } from '../../types'
import { formatearPesos } from '../../utils/formato'
import { DialogoConsumo } from './consumos/DialogoConsumo'
import { DialogoCobrar } from './mesas/DialogoCobrar'
import { DialogoIniciar } from './mesas/DialogoIniciar'
import { DialogoNuevaMesa } from './mesas/DialogoNuevaMesa'
import { DialogoTarifas } from './mesas/DialogoTarifas'
import { TarjetaMesa } from './mesas/TarjetaMesa'

type Filtro = ModoJuego | 'todas'
type Dialogo =
  | { tipo: 'iniciar'; mesa: Mesa }
  | { tipo: 'cobrar'; mesa: Mesa; sesion: Sesion }
  | { tipo: 'consumo'; mesa: Mesa }
  | { tipo: 'tarifas' }
  | { tipo: 'nueva' }
  | null

const TITULOS = {
  iniciar: 'Iniciar sesión de juego',
  cobrar: 'Finalizar y cobrar',
  consumo: 'Agregar consumo',
  tarifas: 'Tarifas',
  nueva: 'Nueva mesa',
}

const filtros: Filtro[] = ['todas', 'pool', 'tres-bandas', 'libre']

export function Mesas() {
  const esAdministrador = useEsAdministrador()
  const sesiones = useSesiones()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [error, setError] = useState('')
  const mesas = useMesas()

  const calcular = useCalculadoraCuenta()

  const estados = mesas.map((m) => estadoMesa(sesiones[m.id]))
  const cuentas = new Map(
    mesas.flatMap((m) => {
      const sesion = sesiones[m.id]
      return sesion ? [[m.id, calcular(sesion, ahora)] as const] : []
    }),
  )
  const enCurso = [...cuentas.values()].reduce((total, c) => total + c.total, 0)
  const visibles = filtro === 'todas' ? mesas : mesas.filter((m) => m.modo === filtro)

  const cerrar = () => setDialogo(null)

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Mesas" subtitulo="Control de mesas en tiempo real" />
        {esAdministrador && (
          <div className="acciones-cabecera">
            <button type="button" className="boton boton-secundario" onClick={() => setDialogo({ tipo: 'tarifas' })}>
              <Tags size={16} aria-hidden="true" /> Tarifas
            </button>
            <button type="button" className="boton" onClick={() => setDialogo({ tipo: 'nueva' })}>
              <Plus size={16} aria-hidden="true" /> Nueva mesa
            </button>
          </div>
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

      {error && (
        <p role="alert" className="alerta-clara">
          {error}
        </p>
      )}

      {mesas.length === 0 && (
        <p className="texto-suave">
          {esAdministrador ? 'El club todavía no tiene mesas. Agrega la primera con «Nueva mesa».' : 'El club todavía no tiene mesas.'}
        </p>
      )}

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
            onFinalizar={async () => {
              setError('')
              try {
                setDialogo({ tipo: 'cobrar', mesa, sesion: await detenerSesion(mesa.id) })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo finalizar la mesa.')
              }
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
        {dialogo?.tipo === 'nueva' && <DialogoNuevaMesa onListo={cerrar} />}
        {dialogo?.tipo === 'consumo' && <DialogoConsumo mesa={dialogo.mesa} onListo={cerrar} />}
        {dialogo?.tipo === 'cobrar' && (
          <DialogoCobrar mesa={dialogo.mesa} sesion={dialogo.sesion} onListo={cerrar} />
        )}
      </Modal>
    </section>
  )
}
