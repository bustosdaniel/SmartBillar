from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Notificacion, Usuario
from app.models.enums import Rol, TipoNotificacion


def notificar(
    db: Session, usuario_id: int, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None = None
) -> None:
    db.add(Notificacion(usuario_id=usuario_id, tipo=tipo, asunto=asunto, mensaje=mensaje, ruta=ruta, leida=False))


def notificar_administradores(
    db: Session, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None = None
) -> None:
    """Lo que hace un cliente le llega a cada empleado en su bandeja."""
    for usuario_id in db.scalars(select(Usuario.id).where(Usuario.rol == Rol.ADMIN)):
        notificar(db, usuario_id, tipo, asunto, mensaje, ruta)
