from pydantic import Field, field_validator

from app.schemas.comun import EsquemaCamel, Milisegundos


class PlanSalida(EsquemaCamel):
    id: str
    nombre: str
    precio_mensual: int
    descuento_mesa: int
    horas_gratis_mes: int
    descuento_bar: int
    descuento_torneo: int
    extras: list[str]


class PlanEntrada(EsquemaCamel):
    """Lo que el administrador edita de un plan (el id y el nombre no cambian)."""

    precio_mensual: int = Field(ge=0)
    descuento_mesa: int = Field(ge=0, le=100)
    horas_gratis_mes: int = Field(ge=0, le=744)
    descuento_bar: int = Field(ge=0, le=100)
    descuento_torneo: int = Field(ge=0, le=100)
    extras: list[str] = []

    @field_validator("extras")
    @classmethod
    def sin_vacios(cls, extras: list[str]) -> list[str]:
        return [e.strip() for e in extras if e.strip()]


class MembresiaSalida(EsquemaCamel):
    cliente_id: int
    cliente_nombre: str
    plan_id: str
    inicio: Milisegundos
    vence: Milisegundos


class SolicitudSalida(EsquemaCamel):
    cliente_id: int
    cliente_nombre: str
    plan_id: str
    fecha: Milisegundos


class SolicitudEntrada(EsquemaCamel):
    plan_id: str


class AsignarEntrada(EsquemaCamel):
    """El personal activa o renueva la membresía de un cliente después de cobrarla en caja."""

    cliente_id: int
    plan_id: str


class MiMembresia(EsquemaCamel):
    """Lo que ve el cliente: su membresía (o ninguna) y su solicitud pendiente (o ninguna)."""

    membresia: MembresiaSalida | None
    solicitud: SolicitudSalida | None
