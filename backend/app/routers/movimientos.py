from fastapi import APIRouter, status

from app.deps import BaseDeDatos, Empleado
from app.models import Movimiento
from app.schemas.notificaciones import MovimientoEntrada, MovimientoSalida
from app.services import notificaciones as servicio

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


@router.get("", response_model=list[MovimientoSalida])
def listar(db: BaseDeDatos, _empleado: Empleado):
    return servicio.listar_movimientos(db)


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def crear(datos: MovimientoEntrada, db: BaseDeDatos, _empleado: Empleado):
    """TEMPORAL hasta pasar las mesas al backend: solo el personal las maneja."""
    db.add(Movimiento(tipo=datos.tipo, titulo=datos.titulo, detalle=datos.detalle))
    db.commit()
