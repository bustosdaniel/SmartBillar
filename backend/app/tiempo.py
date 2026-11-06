"""Fechas: la base guarda UTC sin zona (DATETIME de MySQL); el club vive en la hora de Colombia."""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.config import configuracion

ZONA_CLUB = ZoneInfo(configuracion.zona_horaria)


def ahora_utc() -> datetime:
    """Momento actual en UTC, sin zona, como se guarda en la base."""
    return datetime.now(UTC).replace(tzinfo=None)


def a_utc(fecha: datetime) -> datetime:
    """Convierte una fecha con zona (ej. hora del club) a UTC sin zona, para guardarla."""
    return fecha.astimezone(UTC).replace(tzinfo=None)


def a_milisegundos(fecha: datetime) -> int:
    """UTC sin zona → milisegundos desde 1970, el formato que usa el frontend (Date.now())."""
    return int(fecha.replace(tzinfo=UTC).timestamp() * 1000)
