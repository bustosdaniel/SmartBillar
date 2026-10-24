from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import TipoMovimiento, TipoNotificacion, columna_enum


class Notificacion(Base):
    """Aviso en la bandeja del usuario; el backend además lo envía por correo."""

    __tablename__ = "notificaciones"
    __table_args__ = (Index("ix_notificaciones_bandeja", "usuario_id", "leida", "fecha"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    tipo: Mapped[TipoNotificacion] = mapped_column(columna_enum(TipoNotificacion, "tipo_notificacion"))
    asunto: Mapped[str] = mapped_column(String(160))
    mensaje: Mapped[str] = mapped_column(Text)
    # Vista del frontend a la que lleva al abrirla (ej. /cliente/torneos/3).
    ruta: Mapped[str | None] = mapped_column(String(120))
    leida: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Movimiento(Base):
    """Actividad del club para "Últimos movimientos" del Inicio del admin."""

    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[TipoMovimiento] = mapped_column(columna_enum(TipoMovimiento, "tipo_movimiento"))
    titulo: Mapped[str] = mapped_column(String(120))
    detalle: Mapped[str] = mapped_column(String(200))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
