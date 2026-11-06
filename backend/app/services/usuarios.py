from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Usuario
from app.models.enums import Cargo, Rol, TipoNotificacion
from app.seguridad import encriptar_password, verificar_password
from app.services.notificaciones import notificar_administradores

# Contraseña de las cuentas que crea el personal en caja; el cliente la cambia desde su perfil.
PASSWORD_TEMPORAL = "123456"


class ErrorDeDatos(ValueError):
    """Dato rechazado por una regla del negocio; el mensaje se muestra tal cual al usuario."""


def buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.strip().lower()))


def buscar_cliente_por_email(db: Session, email: str) -> Usuario | None:
    """Sin distinguir mayúsculas ni espacios alrededor, como en el login."""
    usuario = buscar_por_email(db, email)
    return usuario if usuario is not None and usuario.rol == Rol.CLIENTE else None


def listar_usuarios(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).order_by(Usuario.nombre)))


def listar_empleados(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).where(Usuario.rol == Rol.ADMIN).order_by(Usuario.nombre)))


def autenticar(db: Session, email: str, password: str) -> Usuario | None:
    usuario = buscar_por_email(db, email)
    if usuario is None or not verificar_password(password, usuario.password_hash):
        return None
    return usuario


def _validar_correo_libre(db: Session, email: str, excepto_id: int | None = None) -> None:
    otro = buscar_por_email(db, email)
    if otro is not None and otro.id != excepto_id:
        raise ErrorDeDatos("Ya existe una cuenta con ese correo.")


def registrar_cliente(
    db: Session,
    *,
    nombre: str,
    email: str,
    telefono: str,
    password: str = PASSWORD_TEMPORAL,
    avisar: bool = True,
) -> Usuario:
    """`avisar`: si el cliente se registra solo, se avisa al personal; si lo registra el personal, no."""
    _validar_correo_libre(db, email)
    cliente = Usuario(
        nombre=nombre,
        email=email.strip().lower(),
        telefono=telefono,
        rol=Rol.CLIENTE,
        password_hash=encriptar_password(password),
    )
    db.add(cliente)
    db.flush()
    if avisar:
        notificar_administradores(
            db,
            TipoNotificacion.CUENTA,
            "Nuevo cliente registrado",
            f"{nombre} creó su cuenta ({cliente.email}).",
            ruta="/admin/usuarios",
        )
    return cliente


def actualizar_perfil(db: Session, usuario: Usuario, *, nombre: str, email: str, telefono: str) -> Usuario:
    _validar_correo_libre(db, email, excepto_id=usuario.id)
    usuario.nombre = nombre
    usuario.email = email.strip().lower()
    usuario.telefono = telefono
    return usuario


def cambiar_password(usuario: Usuario, actual: str, nueva: str) -> None:
    if not verificar_password(actual, usuario.password_hash):
        raise ErrorDeDatos("La contraseña actual no es correcta.")
    usuario.password_hash = encriptar_password(nueva)


def cambiar_cargo(db: Session, empleado_id: int, cargo: Cargo) -> Usuario:
    empleado = db.get(Usuario, empleado_id)
    if empleado is None or empleado.rol != Rol.ADMIN:
        raise ErrorDeDatos("Ese usuario no es un empleado del club.")
    if empleado.cargo == Cargo.ADMINISTRADOR and cargo != Cargo.ADMINISTRADOR:
        administradores = db.scalar(
            select(func.count()).select_from(Usuario).where(Usuario.cargo == Cargo.ADMINISTRADOR)
        )
        if administradores <= 1:
            raise ErrorDeDatos("Debe quedar al menos un administrador.")
    empleado.cargo = cargo
    return empleado
