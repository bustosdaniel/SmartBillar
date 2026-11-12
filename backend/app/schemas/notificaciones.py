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


class MovimientoSalida(EsquemaCamel):
    id: int
    tipo: TipoMovimiento
    titulo: str
    detalle: str
    fecha: Milisegundos
