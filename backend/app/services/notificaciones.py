from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.models import Movimiento, Notificacion, Usuario
from app.models.enums import Rol, TipoNotificacion

MAXIMO_NOTIFICACIONES = 300
MAXIMO_MOVIMIENTOS = 50


def notificar(
    db: Session, usuario_id: int, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None = None
) -> None:
    db.add(Notificacion(usuario_id=usuario_id, tipo=tipo, asunto=asunto, mensaje=mensaje, ruta=ruta, leida=False))


def _notificar_rol(db: Session, rol: Rol, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None) -> None:
    for usuario_id in db.scalars(select(Usuario.id).where(Usuario.rol == rol)):
        notificar(db, usuario_id, tipo, asunto, mensaje, ruta)


def notificar_administradores(
    db: Session, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None = None
) -> None:
    """Lo que hace un cliente le llega a cada empleado en su bandeja."""
    _notificar_rol(db, Rol.ADMIN, tipo, asunto, mensaje, ruta)


def notificar_clientes(
    db: Session, tipo: TipoNotificacion, asunto: str, mensaje: str, ruta: str | None = None
) -> None:
    _notificar_rol(db, Rol.CLIENTE, tipo, asunto, mensaje, ruta)


def listar(db: Session, usuario: Usuario) -> list[dict]:
    """Las propias, y para el personal también las de los clientes (el registro de correos)."""
    visibles = Notificacion.usuario_id == usuario.id
    if usuario.rol == Rol.ADMIN:
        visibles = or_(visibles, Usuario.rol == Rol.CLIENTE)
    filas = db.execute(
        select(Notificacion, Usuario.nombre, Usuario.email)
        .join(Usuario, Notificacion.usuario_id == Usuario.id)
        .where(visibles)
        .order_by(Notificacion.fecha.desc(), Notificacion.id.desc())
        .limit(MAXIMO_NOTIFICACIONES)
    )
    return [
        {
            "id": n.id,
            "usuario_id": n.usuario_id,
            "nombre": nombre,
            "email": email,
            "tipo": n.tipo,
            "asunto": n.asunto,
            "mensaje": n.mensaje,
            "fecha": n.fecha,
            "leida": n.leida,
            "ruta": n.ruta,
        }
        for n, nombre, email in filas
    ]


def marcar_leida(db: Session, usuario_id: int, notificacion_id: int) -> bool:
    """False si no existe o es de otro usuario."""
    notificacion = db.get(Notificacion, notificacion_id)
    if notificacion is None or notificacion.usuario_id != usuario_id:
        return False
    notificacion.leida = True
    return True


def marcar_todas_leidas(db: Session, usuario_id: int) -> None:
    db.execute(
        update(Notificacion).where(Notificacion.usuario_id == usuario_id, Notificacion.leida.is_(False)).values(leida=True)
    )


def listar_movimientos(db: Session) -> list[Movimiento]:
    consulta = select(Movimiento).order_by(Movimiento.fecha.desc(), Movimiento.id.desc()).limit(MAXIMO_MOVIMIENTOS)
    return list(db.scalars(consulta))
