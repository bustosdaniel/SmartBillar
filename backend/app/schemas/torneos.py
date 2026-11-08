from datetime import date, time
from typing import Annotated

from pydantic import Field, StringConstraints

from app.models.enums import CategoriaTorneo, EstadoTorneo, ModoJuego
from app.schemas.caja import DatosPago
from app.schemas.comun import EsquemaCamel


class JugadorSalida(EsquemaCamel):
    id: int
    cliente_id: int
    nombre: str
    pagado: bool
    monto: int


class PartidoSalida(EsquemaCamel):
    id: int
    ronda: int
    posicion: int
    a: int | None
    b: int | None
    mesa_id: int | None
    ganador: int | None


class TorneoSalida(EsquemaCamel):
    id: int
    nombre: str
    modo: ModoJuego
    categoria: CategoriaTorneo
    fecha: date
    hora: str
    cupos: int
    inscripcion: int
    premio: str
    estado: EstadoTorneo
    jugadores: list[JugadorSalida]
    partidos: list[PartidoSalida]


class TorneoEntrada(EsquemaCamel):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    modo: ModoJuego
    categoria: CategoriaTorneo
    fecha: date
    hora: time
    cupos: int = Field(ge=2, le=64)
    inscripcion: int = Field(ge=0)
    premio: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class CobroEntrada(EsquemaCamel):
    """Sin `pago` cuando la inscripción no cuesta nada (por ejemplo, con el descuento de la membresía)."""

    pago: DatosPago | None = None


class InscripcionEntrada(CobroEntrada):
    cliente_id: int


class MesaPartidoEntrada(EsquemaCamel):
    mesa_id: int | None


class GanadorEntrada(EsquemaCamel):
    jugador_id: int
