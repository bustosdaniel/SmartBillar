"""Caja: un turno a la vez, con base inicial y arqueo al cerrar. Todo cobro (mesas, inscripciones,
membresías) entra aquí; los egresos salen en efectivo del cajón. Misma lógica que frontend/src/caja."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Caja, Egreso, Jugador, Movimiento, Pago
from app.models.enums import MetodoPago, TipoMovimiento, TipoNotificacion
from app.services.notificaciones import notificar_administradores
from app.services.usuarios import ErrorDeDatos
from app.tiempo import ahora_utc

NOMBRES_METODO = {MetodoPago.EFECTIVO: "Efectivo", MetodoPago.TRANSFERENCIA: "Transferencia", MetodoPago.TARJETA: "Tarjeta"}


def pesos(valor: int) -> str:
    return "$ " + f"{valor:,}".replace(",", ".")


def caja_abierta(db: Session) -> Caja | None:
    return db.scalar(select(Caja).where(Caja.cierre.is_(None)))


def _exigir_abierta(db: Session) -> Caja:
    caja = caja_abierta(db)
    if caja is None:
        raise ErrorDeDatos("La caja está cerrada. Ábrela para poder cobrar.")
    return caja


def pagos_validos(caja: Caja) -> list[Pago]:
    return [p for p in caja.pagos if p.anulado_en is None]


def efectivo_esperado(caja: Caja) -> int:
    """Base + cobros en efectivo − egresos en efectivo (los pagados por transferencia o tarjeta no salen del cajón)."""
    efectivo = sum(p.monto for p in pagos_validos(caja) if p.metodo == MetodoPago.EFECTIVO)
    return caja.base + efectivo - sum(e.monto for e in caja.egresos if e.metodo == MetodoPago.EFECTIVO)


def abrir(db: Session, base: int) -> Caja:
    if caja_abierta(db) is not None:
        raise ErrorDeDatos("Ya hay una caja abierta.")
    caja = Caja(base=base)
    db.add(caja)
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Caja abierta", detalle=f"Base {pesos(base)}"))
    db.flush()
    return caja


def cerrar(db: Session, contado: int, nota: str) -> Caja:
    caja = _exigir_abierta(db)
    diferencia = contado - efectivo_esperado(caja)
    if diferencia != 0 and not nota.strip():
        raise ErrorDeDatos("El arqueo no cuadra: escribe una observación para cerrar la caja.")
    caja.cierre, caja.contado, caja.nota = ahora_utc(), contado, nota.strip() or None
    caja.cerrada_por_id = db.info.get("usuario_id")
    detalle = (
        "Arqueo cuadrado"
        if diferencia == 0
        else f"{'Sobrante' if diferencia > 0 else 'Faltante'} de {pesos(abs(diferencia))}"
    )
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Caja cerrada", detalle=detalle))
    db.flush()
    return caja


def registrar_pago(
    db: Session,
    *,
    concepto: str,
    cliente: str,
    monto: int,
    metodo: MetodoPago,
    recibido: int | None = None,
    referencia: str | None = None,
    cliente_id: int | None = None,
    sesion_id: int | None = None,
    jugador_id: int | None = None,
) -> Pago:
    caja = _exigir_abierta(db)
    referencia = (referencia or "").strip() or None
    # Sin la referencia del comprobante no hay cómo comprobar después que la plata sí llegó.
    if metodo == MetodoPago.TRANSFERENCIA and (referencia is None or len(referencia) < 4):
        raise ErrorDeDatos("Escribe la referencia del comprobante de la transferencia (mínimo 4 caracteres).")
    if metodo != MetodoPago.TRANSFERENCIA:
        referencia = None
    if metodo == MetodoPago.EFECTIVO:
        if recibido is None or recibido < monto:
            raise ErrorDeDatos(f"El efectivo recibido no alcanza para {pesos(monto)}.")
        cambio = recibido - monto
    else:
        recibido = cambio = None
    pago = Pago(
        caja_id=caja.id,
        concepto=concepto,
        cliente_nombre=cliente,
        cliente_id=cliente_id,
        monto=monto,
        metodo=metodo,
        recibido=recibido,
        cambio=cambio,
        referencia=referencia,
        sesion_id=sesion_id,
        jugador_id=jugador_id,
    )
    db.add(pago)
    db.add(
        Movimiento(tipo=TipoMovimiento.PAGO, titulo=f"Cobro · {concepto}", detalle=f"{NOMBRES_METODO[metodo]} · {pesos(monto)}")
    )
    # Todo el personal (administradores y cajeros) se entera de cada cobro, lo haga quien lo haga.
    con_referencia = f" (ref. {referencia})" if referencia else ""
    notificar_administradores(
        db,
        TipoNotificacion.FACTURA,
        f"Cobro registrado · {concepto}",
        f"{cliente} pagó {pesos(monto)} por {NOMBRES_METODO[metodo].lower()}{con_referencia}.",
        ruta="/admin/caja",
    )
    db.flush()
    return pago


def registrar_egreso(db: Session, concepto: str, monto: int, metodo: MetodoPago = MetodoPago.EFECTIVO) -> Egreso:
    caja = _exigir_abierta(db)
    # En efectivo sale del cajón: no puede ser más de lo que hay. Por transferencia o tarjeta, no lo toca.
    disponible = efectivo_esperado(caja)
    if metodo == MetodoPago.EFECTIVO and monto > disponible:
        raise ErrorDeDatos(
            f"En el cajón solo hay {pesos(max(0, disponible))} en efectivo. Si se pagó de otra forma, elige transferencia o tarjeta."
        )
    egreso = Egreso(caja_id=caja.id, concepto=concepto, monto=monto, metodo=metodo)
    db.add(egreso)
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Egreso", detalle=f"{concepto} · {pesos(monto)}"))
    db.flush()
    return egreso


def anular_pago(db: Session, pago_id: int) -> Pago:
    """El datáfono o el banco rechazó el pago después de registrarlo. El efectivo no se anula: ese
    dinero sí entró al cajón. Solo en la caja abierta."""
    pago = db.get(Pago, pago_id)
    caja = caja_abierta(db)
    if pago is None or caja is None or pago.caja_id != caja.id:
        raise ErrorDeDatos("Solo se pueden anular cobros de la caja abierta.")
    if pago.metodo == MetodoPago.EFECTIVO:
        raise ErrorDeDatos("El efectivo no se anula: ese dinero sí entró al cajón.")
    if pago.anulado_en is not None:
        raise ErrorDeDatos("Ese cobro ya estaba anulado.")
    pago.anulado_en = ahora_utc()
    pago.anulado_por_id = db.info.get("usuario_id")
    # Si era una mesa, vuelve a quedar Por cobrar. (Import local: mesas usa este módulo para cobrar.)
    if pago.sesion_id is not None:
        from app.services.mesas import reabrir_por_anulacion

        reabrir_por_anulacion(db, pago)
    # Si era una inscripción, el cupo vuelve a quedar pendiente de pago.
    if pago.jugador_id is not None:
        db.get(Jugador, pago.jugador_id).pagado = False
    db.add(
        Movimiento(
            tipo=TipoMovimiento.PAGO,
            titulo=f"Cobro anulado · {pago.concepto}",
            detalle=f"{NOMBRES_METODO[pago.metodo]} rechazada · {pesos(pago.monto)}",
        )
    )
    db.flush()
    return pago


def cierres(db: Session) -> list[Caja]:
    return list(db.scalars(select(Caja).where(Caja.cierre.is_not(None)).order_by(Caja.apertura)))


def a_salida(caja: Caja) -> dict:
    """Separa los pagos anulados, como espera el frontend."""
    return {
        "id": caja.id,
        "apertura": caja.apertura,
        "base": caja.base,
        "pagos": pagos_validos(caja),
        "egresos": caja.egresos,
        "anulados": [p for p in caja.pagos if p.anulado_en is not None],
        "cierre": caja.cierre,
        "contado": caja.contado,
        "nota": caja.nota,
        "abierta_por": caja.registrado_por,
        "cerrada_por": caja.cerrada_por,
    }
