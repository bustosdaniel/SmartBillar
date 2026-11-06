from datetime import date, time

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import CategoriaTorneo, EstadoTorneo, ModoJuego, columna_enum


class Torneo(Base):
    __tablename__ = "torneos"
    __table_args__ = (
        CheckConstraint("cupos >= 2", name="cupos_minimos"),
        CheckConstraint("inscripcion >= 0", name="inscripcion_positiva"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80))
    modo: Mapped[ModoJuego] = mapped_column(columna_enum(ModoJuego, "modo_juego"))
    categoria: Mapped[CategoriaTorneo] = mapped_column(columna_enum(CategoriaTorneo, "categoria_torneo"))
    fecha: Mapped[date] = mapped_column(Date)
    hora: Mapped[time] = mapped_column(Time)
    cupos: Mapped[int] = mapped_column(Integer)
    inscripcion: Mapped[int] = mapped_column(Integer)
    premio: Mapped[str] = mapped_column(String(120))
    estado: Mapped[EstadoTorneo] = mapped_column(
        columna_enum(EstadoTorneo, "estado_torneo"), default=EstadoTorneo.INSCRIPCIONES
    )

    jugadores: Mapped[list["Jugador"]] = relationship(back_populates="torneo", cascade="all, delete-orphan")
    partidos: Mapped[list["Partido"]] = relationship(back_populates="torneo", cascade="all, delete-orphan")


class Jugador(Base):
    """Inscrito en un torneo. `monto` es la inscripción con el descuento de su membresía."""

    __tablename__ = "jugadores"
    __table_args__ = (
        # Un cliente no puede inscribirse dos veces en el mismo torneo.
        UniqueConstraint("torneo_id", "cliente_id", name="uq_jugadores_torneo_cliente"),
        CheckConstraint("monto >= 0", name="monto_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id", ondelete="CASCADE"))
    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    nombre: Mapped[str] = mapped_column(String(120))
    pagado: Mapped[bool] = mapped_column(Boolean, default=False)
    monto: Mapped[int] = mapped_column(Integer)

    torneo: Mapped[Torneo] = relationship(back_populates="jugadores")


class Partido(Base):
    """Partido de eliminación directa. En la primera ronda, un lado vacío es un pase directo;
    en las siguientes, significa que ese ganador aún no se conoce."""

    __tablename__ = "partidos"
    __table_args__ = (
        UniqueConstraint("torneo_id", "ronda", "posicion", name="uq_partidos_lugar"),
        CheckConstraint("ganador_id IS NULL OR ganador_id IN (a_id, b_id)", name="ganador_es_jugador"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id", ondelete="CASCADE"))
    ronda: Mapped[int] = mapped_column(Integer)
    posicion: Mapped[int] = mapped_column(Integer)
    a_id: Mapped[int | None] = mapped_column(ForeignKey("jugadores.id"))
    b_id: Mapped[int | None] = mapped_column(ForeignKey("jugadores.id"))
    mesa_id: Mapped[int | None] = mapped_column(ForeignKey("mesas.id"))
    ganador_id: Mapped[int | None] = mapped_column(ForeignKey("jugadores.id"))

    torneo: Mapped[Torneo] = relationship(back_populates="partidos")
