import { useState } from 'react'
import { Lock, MinusCircle, Undo2 } from 'lucide-react'
import { efectivoEsperado, NOMBRES_METODO, puedeAnularse, totalEgresos, totalPorMetodo, useCaja } from '../../caja/caja'
import { AbrirCaja } from '../../components/AbrirCaja'
import { Encabezado } from '../../components/Encabezado'
import { Modal } from '../../components/Modal'
import { anularCobroMesa } from '../../mesas/sesiones'
import type { Pago } from '../../types'
import { formatearHora, formatearPesos } from '../../utils/formato'
import { DialogoCerrarCaja } from './caja/DialogoCerrarCaja'
import { DialogoEgreso } from './caja/DialogoEgreso'
import { HistorialCierres } from './caja/HistorialCierres'

export function Caja() {
  const caja = useCaja()
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [egresoAbierto, setEgresoAbierto] = useState(false)
  const [anulando, setAnulando] = useState<Pago | null>(null)
  const [errorAnular, setErrorAnular] = useState('')

  if (!caja) {
    return (
      <section className="pagina">
        <Encabezado titulo="Caja" subtitulo="Apertura, cierre y movimientos" />
        <div className="tarjeta caja-cerrada caja-cerrada-grande">
          <Lock size={28} aria-hidden="true" />
          <div>
            <h2>La caja está cerrada</h2>
            <p className="texto-suave">Ábrela al iniciar el turno. Sin caja abierta no se puede cobrar.</p>
          </div>
          <AbrirCaja />
        </div>
        <HistorialCierres />
      </section>
    )
  }

  const total = caja.pagos.reduce((suma, p) => suma + p.monto, 0)
  const anulados = caja.anulados ?? []

  function cerrarAnular() {
    setAnulando(null)
    setErrorAnular('')
  }

  function anular() {
    if (!anulando) return
    const error = anularCobroMesa(anulando)
    if (error) setErrorAnular(error)
    else cerrarAnular()
  }

  return (
    <section className="pagina">
      <header className="panel-cabecera">
        <Encabezado titulo="Caja" subtitulo={`Abierta desde las ${formatearHora(caja.apertura)}`} />
        <div className="acciones-cabecera">
          <button type="button" className="boton boton-secundario" onClick={() => setEgresoAbierto(true)}>
            <MinusCircle size={16} aria-hidden="true" /> Registrar egreso
          </button>
          <button type="button" className="boton boton-peligro" onClick={() => setConfirmarCierre(true)}>
            Cerrar caja
          </button>
        </div>
      </header>

      <div className="grid-resumen">
        <div className="tarjeta dato">
          <span>Base inicial</span>
          <strong>{formatearPesos(caja.base)}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Efectivo en el cajón</span>
          <strong>{formatearPesos(efectivoEsperado(caja))}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Transferencias</span>
          <strong>{formatearPesos(totalPorMetodo(caja, 'transferencia'))}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Tarjeta</span>
          <strong>{formatearPesos(totalPorMetodo(caja, 'tarjeta'))}</strong>
        </div>
        <div className="tarjeta dato">
          <span>Egresos</span>
          <strong className="texto-egreso">{formatearPesos(totalEgresos(caja))}</strong>
        </div>
        <div className="tarjeta dato dato-verde">
          <span>Total cobrado</span>
          <strong>{formatearPesos(total)}</strong>
        </div>
      </div>

      <div className="tarjeta panel-bloque">
        <header className="panel-bloque-cabecera">
          <h2>Pagos del turno</h2>
        </header>
        {caja.pagos.length === 0 ? (
          <p className="texto-suave">Aún no hay pagos. Se registran al finalizar y cobrar una mesa.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Concepto</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th className="numero">Recibido</th>
                  <th className="numero">Cambio</th>
                  <th className="numero">Monto</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {caja.pagos.toReversed().map((p) => (
                  <tr key={p.id}>
                    <td>{formatearHora(p.fecha)}</td>
                    <td>{p.concepto}</td>
                    <td>{p.cliente}</td>
                    <td>{NOMBRES_METODO[p.metodo]}</td>
                    <td className="numero">{p.recibido === null ? '—' : formatearPesos(p.recibido)}</td>
                    <td className="numero">{p.cambio === null ? '—' : formatearPesos(p.cambio)}</td>
                    <td className="numero">
                      <strong>{formatearPesos(p.monto)}</strong>
                    </td>
                    <td>
                      {p.mesa && puedeAnularse(p) && (
                        <button
                          type="button"
                          className="boton-icono boton-icono-claro"
                          aria-label={`Anular cobro de ${p.concepto}`}
                          title="Anular cobro (rechazado)"
                          onClick={() => setAnulando(p)}
                        >
                          <Undo2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {anulados.length > 0 && (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Cobros anulados</h2>
          <ul className="movimientos">
            {anulados.toReversed().map((p) => (
              <li key={p.id}>
                <span className="movimiento-texto">
                  <strong>
                    {p.concepto} · {p.cliente}
                  </strong>
                  <span>
                    {NOMBRES_METODO[p.metodo]} rechazada · cobrado {formatearHora(p.fecha)}, anulado {formatearHora(p.anuladoEn)}
                  </span>
                </span>
                <s className="texto-suave">{formatearPesos(p.monto)}</s>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(caja.egresos ?? []).length > 0 && (
        <div className="tarjeta panel-bloque">
          <h2 className="titulo-bloque">Egresos del turno</h2>
          <ul className="movimientos">
            {(caja.egresos ?? []).toReversed().map((e) => (
              <li key={e.id}>
                <span className="movimiento-texto">
                  <strong>{e.concepto}</strong>
                  <span>{formatearHora(e.fecha)}</span>
                </span>
                <strong className="texto-egreso">−{formatearPesos(e.monto)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal abierto={anulando !== null} titulo="Anular cobro" onCerrar={cerrarAnular}>
        {anulando && (
          <div className="formulario-claro">
            <p>
              ¿El {anulando.metodo === 'tarjeta' ? 'datáfono' : 'banco'} rechazó el pago de{' '}
              <strong>{formatearPesos(anulando.monto)}</strong> ({anulando.concepto} · {anulando.cliente})? Se quita de la
              caja y la mesa vuelve a quedar Por cobrar para cobrarla de nuevo.
            </p>
            {errorAnular && (
              <p role="alert" className="alerta-clara">
                {errorAnular}
              </p>
            )}
            <div className="dialogo-acciones">
              <button type="button" className="boton boton-secundario" onClick={cerrarAnular}>
                No, fue aprobado
              </button>
              <button type="button" className="boton boton-peligro" onClick={anular}>
                Sí, anular cobro
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal abierto={egresoAbierto} titulo="Registrar egreso" onCerrar={() => setEgresoAbierto(false)}>
        <DialogoEgreso onListo={() => setEgresoAbierto(false)} />
      </Modal>

      <Modal abierto={confirmarCierre} titulo="Cerrar caja · arqueo" onCerrar={() => setConfirmarCierre(false)}>
        <DialogoCerrarCaja caja={caja} onListo={() => setConfirmarCierre(false)} />
      </Modal>

      <HistorialCierres />
    </section>
  )
}
