from fastapi import APIRouter, HTTPException, status

from app.deps import BaseDeDatos, Empleado, UsuarioActual
from app.models import Usuario
from app.schemas.notificaciones import NotificacionEntrada, NotificacionSalida
from app.services import notificaciones as servicio

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


@router.get("", response_model=list[NotificacionSalida])
def listar(db: BaseDeDatos, usuario: UsuarioActual):
    """Las propias; el personal ve además las de los clientes (el registro de correos)."""
    return servicio.listar(db, usuario)


@router.patch("/leidas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas(db: BaseDeDatos, usuario: UsuarioActual):
    servicio.marcar_todas_leidas(db, usuario.id)
    db.commit()


@router.patch("/{notificacion_id}/leida", status_code=status.HTTP_204_NO_CONTENT)
def marcar_una(notificacion_id: int, db: BaseDeDatos, usuario: UsuarioActual):
    """Solo sobre las propias: la de otro usuario responde igual que si no existiera."""
    if not servicio.marcar_leida(db, usuario.id, notificacion_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa notificación no existe.")
    db.commit()


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def crear(datos: NotificacionEntrada, db: BaseDeDatos, _empleado: Empleado):
    """TEMPORAL hasta pasar las mesas al backend: solo el personal las maneja."""
    if db.get(Usuario, datos.usuario_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese usuario no existe.")
    servicio.notificar(db, datos.usuario_id, datos.tipo, datos.asunto, datos.mensaje, datos.ruta)
    db.commit()
