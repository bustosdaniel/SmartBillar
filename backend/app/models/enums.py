"""Valores fijos compartidos con el frontend (frontend/src/types.ts). Se guardan con el mismo texto."""

from enum import StrEnum

from sqlalchemy import Enum


class Rol(StrEnum):
    CLIENTE = "cliente"
    ADMIN = "admin"


class Cargo(StrEnum):
    ADMINISTRADOR = "administrador"
    CAJERO = "cajero"


class ModoJuego(StrEnum):
    POOL = "pool"
    TRES_BANDAS = "tres-bandas"
    LIBRE = "libre"


class CategoriaProducto(StrEnum):
    BEBIDA = "bebida"
    PAQUETE = "paquete"


class MetodoPago(StrEnum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    TARJETA = "tarjeta"


class EstadoTorneo(StrEnum):
    INSCRIPCIONES = "inscripciones"
    EN_CURSO = "en-curso"
    FINALIZADO = "finalizado"


class CategoriaTorneo(StrEnum):
    ABIERTA = "abierta"
    PRINCIPIANTE = "principiante"
    AVANZADO = "avanzado"


class TipoNotificacion(StrEnum):
    FACTURA = "factura"
    MEMBRESIA = "membresia"
    TORNEO = "torneo"
    CUENTA = "cuenta"
    MESA = "mesa"


class TipoMovimiento(StrEnum):
    INICIO = "inicio"
    PAUSA = "pausa"
    REANUDAR = "reanudar"
    DETENER = "detener"
    FIN = "fin"
    PAGO = "pago"
    CAJA = "caja"
    TORNEO = "torneo"
    CONSUMO = "consumo"


def columna_enum(enum: type[StrEnum], nombre: str) -> Enum:
    """Columna ENUM que guarda el valor ('tres-bandas'), no el nombre (TRES_BANDAS)."""
    return Enum(enum, name=nombre, values_callable=lambda e: [m.value for m in e])
