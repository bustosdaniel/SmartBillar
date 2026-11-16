import os
from collections.abc import Iterator

from sqlalchemy import MetaData, NullPool, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import configuracion

# Nombres fijos para índices y restricciones: así las migraciones de Alembic son estables.
CONVENCION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCION)


# Aiven (plan gratis) acepta pocas conexiones a la vez y todos comparten la misma base: la API en
# Vercel, el backend local y las migraciones. Si se pasan, MySQL responde "Too many connections" y
# cualquier pantalla queda vacía (torneos, notificaciones…).
# - En Vercel cada instancia es efímera y puede haber varias: sin pool, cada petición abre y cierra la
#   suya, así ninguna instancia congelada se queda con conexiones ocupadas.
# - En local, un pool pequeño que además devuelve las conexiones que llevan rato sin usarse.
if os.environ.get("VERCEL"):
    motor = create_engine(configuracion.database_url, poolclass=NullPool)
else:
    motor = create_engine(
        configuracion.database_url, pool_pre_ping=True, pool_size=3, max_overflow=2, pool_recycle=300
    )


# MySQL no guarda la zona horaria en DATETIME: todas las fechas se guardan y leen en UTC.
@event.listens_for(motor, "connect")
def _usar_utc(conexion_dbapi, _registro) -> None:
    with conexion_dbapi.cursor() as cursor:
        cursor.execute("SET time_zone = '+00:00'")
        # Una conexión olvidada (una instancia de Vercel que se congeló) se libera a los 5 minutos y no
        # a las 8 horas que trae Aiven por defecto.
        cursor.execute("SET SESSION wait_timeout = 300")


SesionLocal = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


# Auditoría (#68): cada registro nuevo con `registrado_por_id` (cajas, pagos, egresos, movimientos)
# queda a nombre del empleado de la petición, que deps.usuario_actual dejó en db.info.
@event.listens_for(Session, "before_flush")
def registrar_responsable(sesion: Session, _contexto, _instancias) -> None:
    usuario_id = sesion.info.get("usuario_id")
    if usuario_id is None:
        return
    for objeto in sesion.new:
        if hasattr(objeto, "registrado_por_id") and objeto.registrado_por_id is None:
            objeto.registrado_por_id = usuario_id


def obtener_db() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión de base de datos por petición."""
    with SesionLocal() as db:
        yield db
