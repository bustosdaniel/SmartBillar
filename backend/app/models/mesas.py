from datetime import datetime, time

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Time,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import CategoriaProducto, ModoJuego, columna_enum


class Mesa(Base):
    __tablename__ = "mesas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40), unique=True)
    modo: Mapped[ModoJuego] = mapped_column(columna_enum(ModoJuego, "modo_juego"))


class TarifaModo(Base):
    """Precio base por hora de cada modo de juego (solo se cobra por tiempo)."""

    __tablename__ = "tarifas"
    __table_args__ = (CheckConstraint("hora >= 0", name="hora_positiva"),)

    modo: Mapped[ModoJuego] = mapped_column(columna_enum(ModoJuego, "modo_juego"), primary_key=True)
    hora: Mapped[int] = mapped_column(Integer)


class ReglaHorario(Base):
    """Ajuste de precio para ciertos días y horas (negativo = descuento).
    Si `desde` es mayor que `hasta`, la franja cruza la medianoche (ej. 20:00 a 02:00)."""

    __tablename__ = "reglas_horario"
    __table_args__ = (
        CheckConstraint("ajuste BETWEEN -100 AND 100", name="ajuste_porcentaje"),
        CheckConstraint("dias <@ ARRAY[0,1,2,3,4,5,6]::smallint[]", name="dias_validos"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    # 0 = domingo … 6 = sábado, como Date.getDay() en el frontend.
    dias: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger))
    desde: Mapped[time] = mapped_column(Time)
    hasta: Mapped[time] = mapped_column(Time)
    ajuste: Mapped[int] = mapped_column(Integer)


class SesionMesa(Base):
    """Sesión de juego. Activa mientras `fin` es NULL; al cobrar se guardan los totales."""

    __tablename__ = "sesiones"
    __table_args__ = (
        # Una sola sesión activa por mesa: lo garantiza la base de datos, no solo el código.
        Index("uq_sesiones_mesa_activa", "mesa_id", unique=True, postgresql_where=text("fin IS NULL")),
        CheckConstraint("pausado_ms >= 0", name="pausado_positivo"),
        CheckConstraint("fin IS NULL OR detenida_en IS NOT NULL", name="fin_tras_detener"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    mesa_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"))
    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    pausado_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    pausada_desde: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Momento en que se pulsó Finalizar: el tiempo queda congelado hasta cobrar.
    detenida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Tarifa congelada al entregar las bolas, con la regla de horario que aplicaba.
    tarifa_hora: Mapped[int] = mapped_column(Integer)
    regla: Mapped[str | None] = mapped_column(String(60))

    # Se llenan al cobrar (y se vacían si el cobro se anula).
    fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tiempo_ms: Mapped[int | None] = mapped_column(BigInteger)
    subtotal: Mapped[int | None] = mapped_column(Integer)
    gratis_ms: Mapped[int | None] = mapped_column(BigInteger)
    descuento: Mapped[int | None] = mapped_column(Integer)
    descuento_bar: Mapped[int | None] = mapped_column(Integer)
    total: Mapped[int | None] = mapped_column(Integer)
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("planes.id"))

    consumos: Mapped[list["Consumo"]] = relationship(back_populates="sesion", cascade="all, delete-orphan")


class Producto(Base):
    """Bebidas y paquetes del diagrama de consumos."""

    __tablename__ = "productos"
    __table_args__ = (CheckConstraint("precio >= 0", name="precio_positivo"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    categoria: Mapped[CategoriaProducto] = mapped_column(columna_enum(CategoriaProducto, "categoria_producto"))
    precio: Mapped[int] = mapped_column(Integer)


class Consumo(Base):
    """Producto pedido en una mesa. El nombre y el precio quedan fijos al pedirlo."""

    __tablename__ = "consumos"
    __table_args__ = (CheckConstraint("cantidad > 0", name="cantidad_positiva"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sesion_id: Mapped[int] = mapped_column(ForeignKey("sesiones.id", ondelete="CASCADE"))
    producto_id: Mapped[str] = mapped_column(ForeignKey("productos.id"))
    nombre: Mapped[str] = mapped_column(String(60))
    precio: Mapped[int] = mapped_column(Integer)
    cantidad: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sesion: Mapped[SesionMesa] = relationship(back_populates="consumos")
