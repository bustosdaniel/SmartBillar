from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Plan(Base):
    """Básica, Premium y Gold: el admin edita precios y beneficios."""

    __tablename__ = "planes"
    __table_args__ = tuple(
        CheckConstraint(f"{campo} BETWEEN 0 AND 100", name=f"{campo}_porcentaje")
        for campo in ("descuento_mesa", "descuento_bar", "descuento_torneo")
    )

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40))
    precio_mensual: Mapped[int] = mapped_column(Integer)
    descuento_mesa: Mapped[int] = mapped_column(Integer, default=0)
    horas_gratis_mes: Mapped[int] = mapped_column(Integer, default=0)
    descuento_bar: Mapped[int] = mapped_column(Integer, default=0)
    descuento_torneo: Mapped[int] = mapped_column(Integer, default=0)
    extras: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)


class Membresia(Base):
    """Membresía vigente o vencida de cada cliente (una por cliente; al renovar se actualiza)."""

    __tablename__ = "membresias"

    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("planes.id"))
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    vence: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SolicitudMembresia(Base):
    """El cliente elige plan en la app y lo paga en caja (una solicitud abierta por cliente)."""

    __tablename__ = "solicitudes_membresia"

    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("planes.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
