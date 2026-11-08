from pydantic import Field

from app.models.enums import TipoMovimiento, TipoNotificacion
from app.schemas.comun import EsquemaCamel, Milisegundos


class NotificacionSalida(EsquemaCamel):
    id: int
    usuario_id: int
    nombre: str
    email: str
    tipo: TipoNotificacion
    asunto: str
    mensaje: str
    fecha: Milisegundos
    leida: bool
    ruta: str | None


class NotificacionEntrada(EsquemaCamel):
    """TEMPORAL: las mesas aún viven en el navegador y envían sus avisos por aquí. Se elimina cuando el
    backend los genere él mismo (paso 4)."""

    usuario_id: int
    tipo: TipoNotificacion
    asunto: str = Field(min_length=1, max_length=160)
    mensaje: str = Field(min_length=1, max_length=2000)
    ruta: str | None = Field(default=None, max_length=120)


class MovimientoSalida(EsquemaCamel):
    id: int
    tipo: TipoMovimiento
    titulo: str
    detalle: str
    fecha: Milisegundos


class MovimientoEntrada(EsquemaCamel):
    """TEMPORAL: igual que NotificacionEntrada."""

    tipo: TipoMovimiento
    titulo: str = Field(min_length=1, max_length=120)
    detalle: str = Field(min_length=1, max_length=200)
