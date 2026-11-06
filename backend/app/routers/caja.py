from fastapi import APIRouter, HTTPException, status

from app.deps import Administrador, BaseDeDatos, Empleado
from app.schemas.caja import (
    AbrirEntrada,
    CajaSalida,
    CerrarEntrada,
    EgresoEntrada,
    EgresoSalida,
    PagoEntrada,
    PagoSalida,
)
from app.services import caja as servicio
from app.services.usuarios import ErrorDeDatos

router = APIRouter(prefix="/caja", tags=["caja"])


def _conflicto(error: ErrorDeDatos) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, str(error))


def _salida(caja) -> CajaSalida:
    return CajaSalida.model_validate(servicio.a_salida(caja))


@router.get("", response_model=CajaSalida | None)
def abierta(db: BaseDeDatos, _empleado: Empleado):
    """La caja del turno, o null si está cerrada."""
    caja = servicio.caja_abierta(db)
    return _salida(caja) if caja else None


@router.post("/abrir", response_model=CajaSalida, status_code=status.HTTP_201_CREATED)
def abrir(datos: AbrirEntrada, db: BaseDeDatos, _empleado: Empleado):
    try:
        caja = servicio.abrir(db, datos.base)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return _salida(caja)


@router.post("/cerrar", response_model=CajaSalida)
def cerrar(datos: CerrarEntrada, db: BaseDeDatos, _empleado: Empleado):
    """Arqueo: el efectivo contado contra el esperado. Si no cuadra, exige una observación."""
    try:
        caja = servicio.cerrar(db, datos.contado, datos.nota)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return _salida(caja)


@router.post("/pagos", response_model=PagoSalida, status_code=status.HTTP_201_CREATED)
def registrar_pago(datos: PagoEntrada, db: BaseDeDatos, _empleado: Empleado):
    try:
        pago = servicio.registrar_pago(db, **datos.model_dump())
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return pago


@router.post("/pagos/{pago_id}/anular", response_model=PagoSalida)
def anular_pago(pago_id: int, db: BaseDeDatos, _admin: Administrador):
    """Tarjeta o transferencia rechazada después de cobrar: solo el administrador."""
    try:
        pago = servicio.anular_pago(db, pago_id)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return pago


@router.post("/egresos", response_model=EgresoSalida, status_code=status.HTTP_201_CREATED)
def registrar_egreso(datos: EgresoEntrada, db: BaseDeDatos, _empleado: Empleado):
    try:
        egreso = servicio.registrar_egreso(db, datos.concepto, datos.monto)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return egreso


@router.get("/cierres", response_model=list[CajaSalida])
def cierres(db: BaseDeDatos, _admin: Administrador):
    """Turnos cerrados, para Reportes y el historial de cierres: solo el administrador."""
    return [_salida(c) for c in servicio.cierres(db)]
