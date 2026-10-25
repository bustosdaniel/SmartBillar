from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import Cargo, Rol, columna_enum


class Usuario(Base):
    """Clientes y empleados. Los empleados tienen rol 'admin' y un cargo (administrador o cajero)."""

    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("(rol = 'admin') = (cargo IS NOT NULL)", name="cargo_solo_empleados"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    # Identifica al cliente: con él inicia sesión y el personal lo busca en caja (BuscarCliente).
    email: Mapped[str] = mapped_column(String(160), unique=True)
    telefono: Mapped[str | None] = mapped_column(String(20))
    rol: Mapped[Rol] = mapped_column(columna_enum(Rol, "rol"))
    cargo: Mapped[Cargo | None] = mapped_column(columna_enum(Cargo, "cargo"))
    # bcrypt: nunca se guarda la contraseña en texto plano (RNF de seguridad).
    password_hash: Mapped[str] = mapped_column(String(255))
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
