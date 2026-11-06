from collections.abc import Iterator

from sqlalchemy import MetaData, create_engine, event
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


motor = create_engine(configuracion.database_url, pool_pre_ping=True)


# MySQL no guarda la zona horaria en DATETIME: todas las fechas se guardan y leen en UTC.
@event.listens_for(motor, "connect")
def _usar_utc(conexion_dbapi, _registro) -> None:
    with conexion_dbapi.cursor() as cursor:
        cursor.execute("SET time_zone = '+00:00'")


SesionLocal = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def obtener_db() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión de base de datos por petición."""
    with SesionLocal() as db:
        yield db
