from fastapi import APIRouter, HTTPException, Response, status

from app.deps import Administrador, BaseDeDatos, Cliente, Empleado, UsuarioActual
from app.models import Membresia, SolicitudMembresia
from app.schemas.membresias import (
    AsignarEntrada,
    MembresiaSalida,
    MiMembresia,
    PlanEntrada,
    PlanSalida,
    SolicitudEntrada,
    SolicitudSalida,
)
from app.services import membresias as servicio
from app.services.usuarios import ErrorDeDatos

router = APIRouter(prefix="/membresias", tags=["membresías"])


def _conflicto(error: ErrorDeDatos) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, str(error))


@router.get("/planes", response_model=list[PlanSalida])
def planes(db: BaseDeDatos, _usuario: UsuarioActual):
    """Los planes con sus precios y beneficios (cualquiera con sesión)."""
    return servicio.listar_planes(db)


@router.put("/planes/{plan_id}", response_model=PlanSalida)
def editar_plan(plan_id: str, datos: PlanEntrada, db: BaseDeDatos, _admin: Administrador):
    """Precios y beneficios: solo el administrador."""
    try:
        plan = servicio.actualizar_plan(db, plan_id, **datos.model_dump())
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    db.commit()
    return plan


@router.get("", response_model=list[MembresiaSalida])
def membresias(db: BaseDeDatos, _empleado: Empleado):
    return servicio.listar_membresias(db)


@router.post("", response_model=MembresiaSalida)
def asignar(datos: AsignarEntrada, db: BaseDeDatos, _empleado: Empleado):
    """Administrador o cajero: activa o renueva la membresía de un cliente (se cobra en caja)."""
    try:
        membresia = servicio.asignar(db, datos.cliente_id, datos.plan_id)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return membresia


@router.get("/solicitudes", response_model=list[SolicitudSalida])
def solicitudes(db: BaseDeDatos, _empleado: Empleado):
    return servicio.listar_solicitudes(db)


@router.delete("/solicitudes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def rechazar(cliente_id: int, db: BaseDeDatos, _empleado: Empleado):
    """Administrador o cajero: no aprueba la solicitud (se le avisa al cliente)."""
    try:
        servicio.rechazar_solicitud(db, cliente_id)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/mia", response_model=MiMembresia)
def mia(db: BaseDeDatos, cliente: Cliente):
    return MiMembresia(
        membresia=db.get(Membresia, cliente.id),
        solicitud=db.get(SolicitudMembresia, cliente.id),
    )


@router.post("/mia/solicitud", response_model=SolicitudSalida, status_code=status.HTTP_201_CREATED)
def solicitar(datos: SolicitudEntrada, db: BaseDeDatos, cliente: Cliente):
    """El cliente elige un plan desde la app; lo paga en caja."""
    try:
        solicitud = servicio.solicitar(db, cliente, datos.plan_id)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return solicitud


@router.delete("/mia/solicitud", status_code=status.HTTP_204_NO_CONTENT)
def cancelar(db: BaseDeDatos, cliente: Cliente):
    try:
        servicio.cancelar_solicitud(db, cliente)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
