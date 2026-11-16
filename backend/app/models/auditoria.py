"""Quién hizo cada operación (tarea #68): el empleado con sesión iniciada en la petición.

`deps.usuario_actual` deja su id en `db.info["usuario_id"]`, y antes de guardar (`db.registrar_responsable`)
se copia a todo registro nuevo que lleve `RegistradoPor`. Así ningún servicio tiene que recibir al empleado.
"""

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship


class RegistradoPor:
    @declared_attr
    def registrado_por_id(cls) -> Mapped[int | None]:
        return mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def _registrador(cls):
        return relationship("Usuario", foreign_keys=[cls.registrado_por_id], lazy="joined", viewonly=True)

    @property
    def registrado_por(self) -> str | None:
        return self._registrador.nombre if self._registrador is not None else None
