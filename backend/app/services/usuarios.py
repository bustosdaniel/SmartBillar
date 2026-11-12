import secrets

from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models import Jugador, Membresia, Movimiento, Notificacion, Pago, SesionMesa, SolicitudMembresia, Torneo, Usuario
from app.models.enums import Cargo, EstadoTorneo, Rol, TipoMovimiento, TipoNotificacion
from app.seguridad import encriptar_password, verificar_password
from app.services.notificaciones import notificar_administradores
from app.tiempo import ahora_utc

# Contraseña de las cuentas que crea el personal en caja; el cliente la cambia desde su perfil.
PASSWORD_TEMPORAL = "123456"


class ErrorDeDatos(ValueError):
    """Dato rechazado por una regla del negocio; el mensaje se muestra tal cual al usuario."""


# Los clientes eliminados no aparecen en ninguna lista, búsqueda ni aviso.
ACTIVO = Usuario.eliminado_en.is_(None)


def buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.strip().lower(), ACTIVO))


def buscar_cliente_por_email(db: Session, email: str) -> Usuario | None:
    """Sin distinguir mayúsculas ni espacios alrededor, como en el login."""
    usuario = buscar_por_email(db, email)
    return usuario if usuario is not None and usuario.rol == Rol.CLIENTE else None


def sugerir_clientes(db: Session, texto: str, limite: int = 8) -> list[Usuario]:
    """Clientes cuyo correo o nombre contiene el texto (sin distinguir mayúsculas), para elegir mientras se
    escribe. Primero los correos que empiezan por el texto, después el resto, por correo."""
    buscado = texto.strip().lower()
    # %, _ y \ se buscan literalmente, no como comodines de LIKE.
    seguro = buscado.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    correo, nombre = func.lower(Usuario.email), func.lower(Usuario.nombre)
    return list(
        db.scalars(
            select(Usuario)
            .where(
                Usuario.rol == Rol.CLIENTE,
                ACTIVO,
                or_(correo.like(f"%{seguro}%", escape="\\"), nombre.like(f"%{seguro}%", escape="\\")),
            )
            .order_by(case((correo.like(f"{seguro}%", escape="\\"), 0), else_=1), Usuario.email)
            .limit(limite)
        )
    )


def listar_usuarios(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).where(ACTIVO).order_by(Usuario.nombre)))


def listar_empleados(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).where(Usuario.rol == Rol.ADMIN, ACTIVO).order_by(Usuario.nombre)))


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
    if nueva == actual:
        raise ErrorDeDatos("La contraseña nueva debe ser distinta de la actual.")
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


def eliminar_cliente(db: Session, cliente_id: int) -> str:
    """Solo el administrador. Sin historial, el cliente se borra de verdad. Con historial (cobros, mesas
    jugadas o torneos) se conserva la fila para que la caja y los reportes cuadren, pero queda eliminado:
    no puede entrar, no aparece en listas ni búsquedas y su correo queda libre para registrarse de nuevo.
    Devuelve "borrado" o "eliminado"."""
    cliente = db.get(Usuario, cliente_id)
    if cliente is None or cliente.rol != Rol.CLIENTE or cliente.eliminado_en is not None:
        raise ErrorDeDatos("Ese cliente no existe.")
    mesa = db.scalar(select(SesionMesa.mesa_id).where(SesionMesa.cliente_id == cliente.id, SesionMesa.fin.is_(None)))
    if mesa is not None:
        raise ErrorDeDatos(f"{cliente.nombre} está en la Mesa {mesa}. Cóbrala antes de eliminarlo.")
    torneo = db.scalar(
        select(Torneo.nombre)
        .join(Jugador, Jugador.torneo_id == Torneo.id)
        .where(Jugador.cliente_id == cliente.id, Torneo.estado != EstadoTorneo.FINALIZADO)
    )
    if torneo is not None:
        raise ErrorDeDatos(f"{cliente.nombre} está inscrito en «{torneo}». Quítalo del torneo antes de eliminarlo.")

    nombre = cliente.nombre
    tiene_historial = db.scalar(
        select(
            exists().where(Pago.cliente_id == cliente.id)
            | exists().where(SesionMesa.cliente_id == cliente.id)
            | exists().where(Jugador.cliente_id == cliente.id)
        )
    )
    if tiene_historial:
        for modelo in (Membresia, SolicitudMembresia):
            fila = db.get(modelo, cliente.id)
            if fila is not None:
                db.delete(fila)
        for aviso in db.scalars(select(Notificacion).where(Notificacion.usuario_id == cliente.id)):
            db.delete(aviso)
        # El correo se libera y la contraseña queda imposible de adivinar.
        cliente.email = f"eliminado-{cliente.id}@eliminado.invalid"
        cliente.telefono = None
        cliente.password_hash = encriptar_password(secrets.token_urlsafe(32))
        cliente.eliminado_en = ahora_utc()
        modo = "eliminado"
    else:
        # Membresía, solicitud y notificaciones se borran solas (ON DELETE CASCADE).
        db.delete(cliente)
        modo = "borrado"
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Cliente eliminado", detalle=nombre))
    db.flush()
    return modo
