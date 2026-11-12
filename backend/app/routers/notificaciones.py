from fastapi import APIRouter, HTTPException, status

from app.deps import BaseDeDatos, UsuarioActual
from app.schemas.notificaciones import NotificacionSalida
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

