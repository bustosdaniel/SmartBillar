"""Todas las tablas. Alembic lee Base.metadata desde aquí para generar las migraciones."""

from app.models.caja import Caja, Egreso, Pago
from app.models.membresias import Membresia, Plan, SolicitudMembresia
from app.models.mesas import Consumo, Mesa, Producto, ReglaHorario, SesionMesa, TarifaModo
from app.models.notificaciones import Movimiento, Notificacion
from app.models.torneos import Jugador, Partido, Torneo
from app.models.usuarios import Usuario

__all__ = [
    "Caja",
    "Consumo",
    "Egreso",
    "Jugador",
    "Membresia",
    "Mesa",
    "Movimiento",
    "Notificacion",
    "Pago",
    "Partido",
    "Plan",
    "Producto",
    "ReglaHorario",
    "SesionMesa",
    "SolicitudMembresia",
    "TarifaModo",
    "Torneo",
    "Usuario",
]
