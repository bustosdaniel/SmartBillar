from datetime import time
from typing import Annotated

from pydantic import Field, StringConstraints, field_serializer, field_validator, model_validator

from app.models.enums import CategoriaProducto, MetodoPago, ModoJuego
from app.schemas.caja import DatosPago, PagoSalida
from app.schemas.comun import TARIFA_HORA_MAXIMA, TARIFA_HORA_MINIMA, EsquemaCamel, Milisegundos

# ---------- Catálogo ----------


class MesaSalida(EsquemaCamel):
    id: int
    nombre: str
    modo: ModoJuego
    # Las retiradas solo sirven para mostrar el nombre en el historial.
    retirada: bool


class MesaEntrada(EsquemaCamel):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    modo: ModoJuego


class ProductoSalida(EsquemaCamel):
    id: str
    nombre: str
    categoria: CategoriaProducto
    precio: int


class PreciosEntrada(EsquemaCamel):
    """Precio nuevo de cada producto, por id. El rango depende de la categoría (lo valida el servicio)."""

    precios: dict[str, int]


class PrecioHora(EsquemaCamel):
    hora: int = Field(ge=TARIFA_HORA_MINIMA, le=TARIFA_HORA_MAXIMA)


class ReglaBase(EsquemaCamel):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
    # 0 = domingo … 6 = sábado, como Date.getDay() en el frontend.
    dias: list[Annotated[int, Field(ge=0, le=6)]] = Field(min_length=1)
    desde: time
    hasta: time
    ajuste: int = Field(ge=-100, le=100)

    @field_serializer("desde", "hasta")
    def _hhmm(self, valor: time) -> str:
        return valor.strftime("%H:%M")


class ReglaSalida(ReglaBase):
    id: int


class ReglaEntrada(ReglaBase):
    @field_validator("dias")
    @classmethod
    def _sin_repetidos(cls, dias: list[int]) -> list[int]:
        return sorted(set(dias))

    @model_validator(mode="after")
    def _horas_distintas(self):
        if self.desde == self.hasta:
            raise ValueError("La hora de inicio y la de fin de una tarifa no pueden ser iguales.")
        return self


class TarifasSalida(EsquemaCamel):
    por_modo: dict[ModoJuego, PrecioHora]
    reglas: list[ReglaSalida]


class TarifasEntrada(EsquemaCamel):
    """La configuración completa: los precios base y todas las reglas (reemplaza las anteriores)."""

    por_modo: dict[ModoJuego, PrecioHora]
    reglas: list[ReglaEntrada] = Field(max_length=20)

    @field_validator("por_modo")
    @classmethod
    def _todos_los_modos(cls, por_modo: dict) -> dict:
        if set(por_modo) != set(ModoJuego):
            raise ValueError("Falta el precio de algún modo de juego.")
        return por_modo


# ---------- Sesiones ----------


class ConsumoSalida(EsquemaCamel):
    id: int
    producto_id: str
    nombre: str
    categoria: CategoriaProducto
    precio: int
    cantidad: int
    fecha: Milisegundos


class SesionSalida(EsquemaCamel):
    """Mismos campos que Sesion de frontend/src/types.ts."""

    id: int
    mesa_id: int
    cliente_id: int | None
    cliente_nombre: str
    inicio: Milisegundos
    pausado_ms: int
    pausada_desde: Milisegundos | None
    detenida_en: Milisegundos | None
    tarifa_hora: int
    regla: str | None
    consumos: list[ConsumoSalida]


class SesionFinalizadaSalida(SesionSalida):
    fin: Milisegundos
    tiempo_ms: int
    total: int
    metodo_pago: MetodoPago | None
    subtotal: int
    gratis_ms: int
    descuento: int
    descuento_bar: int
    plan_id: str | None


class IniciarEntrada(EsquemaCamel):
    cliente_id: int


class ConsumoEntrada(EsquemaCamel):
    producto_id: str
    cantidad: int = Field(ge=1, le=50)


class CobrarEntrada(EsquemaCamel):
    """Solo cómo pagó: el monto lo calcula el backend con la sesión, la tarifa y la membresía."""

    pago: DatosPago


class CuentaSalida(EsquemaCamel):
    """El detalle de lo cobrado (CuentaMesa de frontend/src/mesas/cuenta.ts, con planId en vez del plan)."""

    tarifa_hora: int
    tiempo_ms: int
    subtotal_mesa: int
    consumos: int
    subtotal: int
    plan_id: str | None
    gratis_ms: int
    valor_gratis: int
    porcentaje: int
    descuento: int
    porcentaje_bar: int
    descuento_bar: int
    total: int


class CobroSalida(EsquemaCamel):
    pago: PagoSalida
    sesion: SesionFinalizadaSalida
    cuenta: CuentaSalida
