from pydantic import Field

from app.models.enums import MetodoPago
from app.schemas.comun import EsquemaCamel, Milisegundos


class PagoSalida(EsquemaCamel):
    id: int
    fecha: Milisegundos
    concepto: str
    # En la base es cliente_nombre; el frontend lo llama `cliente`.
    cliente: str = Field(validation_alias="cliente_nombre")
    monto: int
    metodo: MetodoPago
    recibido: int | None
    cambio: int | None


class PagoAnuladoSalida(PagoSalida):
    anulado_en: Milisegundos


class EgresoSalida(EsquemaCamel):
    id: int
    fecha: Milisegundos
    concepto: str
    monto: int


class CajaSalida(EsquemaCamel):
    """Mismos campos que Caja / CajaCerrada de frontend/src/types.ts. Los pagos anulados van aparte:
    no suman en caja, arqueo ni reportes."""

    id: int
    apertura: Milisegundos
    base: int
    pagos: list[PagoSalida]
    egresos: list[EgresoSalida]
    anulados: list[PagoAnuladoSalida]
    cierre: Milisegundos | None = None
    contado: int | None = None
    nota: str | None = None


class AbrirEntrada(EsquemaCamel):
    base: int = Field(ge=0)


class CerrarEntrada(EsquemaCamel):
    contado: int = Field(ge=0)
    nota: str = ""


class DatosPago(EsquemaCamel):
    """Cómo pagó el cliente. En efectivo, lo que entregó: el cambio lo calcula el backend."""

    metodo: MetodoPago
    recibido: int | None = Field(default=None, ge=0)


class PagoEntrada(DatosPago):
    concepto: str = Field(min_length=1, max_length=120)
    cliente: str = Field(min_length=1, max_length=120)
    cliente_id: int | None = None
    monto: int = Field(ge=0)


class EgresoEntrada(EsquemaCamel):
    concepto: str = Field(min_length=1, max_length=120)
    monto: int = Field(gt=0)
