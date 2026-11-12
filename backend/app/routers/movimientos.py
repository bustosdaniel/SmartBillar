from fastapi import APIRouter

from app.deps import BaseDeDatos, Empleado
from app.schemas.notificaciones import MovimientoSalida
from app.services import notificaciones as servicio

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


@router.get("", response_model=list[MovimientoSalida])
def listar(db: BaseDeDatos, _empleado: Empleado):
    return servicio.listar_movimientos(db)

