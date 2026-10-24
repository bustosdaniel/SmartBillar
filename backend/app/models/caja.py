from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import MetodoPago, columna_enum


class Caja(Base):
    """Turno de caja: apertura con base y cierre con arqueo (efectivo contado)."""

    __tablename__ = "cajas"
    __table_args__ = (
        # Solo puede haber una caja abierta a la vez.
        Index("uq_cajas_una_abierta", text("(cierre IS NULL)"), unique=True, postgresql_where=text("cierre IS NULL")),
        CheckConstraint("base >= 0", name="base_positiva"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    apertura: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    base: Mapped[int] = mapped_column(Integer)
    cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contado: Mapped[int | None] = mapped_column(Integer)
    nota: Mapped[str | None] = mapped_column(Text)


class Pago(Base):
    """Cobro registrado en caja: de una mesa, una inscripción o una membresía.
    Un pago anulado (tarjeta o transferencia rechazada) no suma en caja ni en reportes."""

    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint("monto >= 0", name="monto_positivo"),
        CheckConstraint(
            "(metodo = 'efectivo') = (recibido IS NOT NULL AND cambio IS NOT NULL)", name="vueltas_solo_efectivo"
        ),
        CheckConstraint("anulado_en IS NULL OR metodo <> 'efectivo'", name="efectivo_no_se_anula"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    caja_id: Mapped[int] = mapped_column(ForeignKey("cajas.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    concepto: Mapped[str] = mapped_column(String(120))
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    cliente_nombre: Mapped[str] = mapped_column(String(120))
    monto: Mapped[int] = mapped_column(Integer)
    metodo: Mapped[MetodoPago] = mapped_column(columna_enum(MetodoPago, "metodo_pago"))
    recibido: Mapped[int | None] = mapped_column(Integer)
    cambio: Mapped[int | None] = mapped_column(Integer)
    # Origen del cobro (como mucho uno): permite anularlo y deshacer lo que cobró.
    sesion_id: Mapped[int | None] = mapped_column(ForeignKey("sesiones.id"))
    jugador_id: Mapped[int | None] = mapped_column(ForeignKey("jugadores.id", ondelete="SET NULL"))
    anulado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Egreso(Base):
    """Dinero que sale del cajón: compras, servicios, devoluciones…"""

    __tablename__ = "egresos"
    __table_args__ = (CheckConstraint("monto > 0", name="monto_positivo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    caja_id: Mapped[int] = mapped_column(ForeignKey("cajas.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    concepto: Mapped[str] = mapped_column(String(120))
    monto: Mapped[int] = mapped_column(Integer)
