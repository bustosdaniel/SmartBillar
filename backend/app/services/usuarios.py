import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Usuario
from app.models.enums import Rol, TipoNotificacion
from app.seguridad import encriptar_password, verificar_password
from app.services.notificaciones import notificar_administradores


class ErrorDeDatos(ValueError):
    """Dato rechazado por una regla del negocio; el mensaje se muestra tal cual al usuario."""


def normalizar_cedula(cedula: str) -> str:
    """Solo los dígitos: "1.098.765.432" y "1098765432" son la misma cédula (como en el frontend)."""
    return re.sub(r"\D", "", cedula)


def buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.strip().lower()))


def autenticar(db: Session, email: str, password: str) -> Usuario | None:
    usuario = buscar_por_email(db, email)
    if usuario is None or not verificar_password(password, usuario.password_hash):
        return None
    return usuario


def registrar_cliente(db: Session, *, nombre: str, email: str, telefono: str, cedula: str, password: str) -> Usuario:
    if buscar_por_email(db, email) is not None:
        raise ErrorDeDatos("Ya existe una cuenta con ese correo.")
    if db.scalar(select(Usuario).where(Usuario.cedula == cedula)) is not None:
        raise ErrorDeDatos("Ya existe una cuenta con esa cédula.")
    cliente = Usuario(
        nombre=nombre,
        email=email.strip().lower(),
        telefono=telefono,
        cedula=cedula,
        rol=Rol.CLIENTE,
        password_hash=encriptar_password(password),
    )
    db.add(cliente)
    db.flush()
    notificar_administradores(
        db,
        TipoNotificacion.CUENTA,
        "Nuevo cliente registrado",
        f"{nombre} creó su cuenta ({cliente.email}).",
        ruta="/admin/usuarios",
    )
    return cliente
