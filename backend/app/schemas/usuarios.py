from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Cargo, Rol
from app.schemas.comun import Milisegundos


class UsuarioSalida(BaseModel):
    """Mismos campos que el tipo Usuario de frontend/src/types.ts (nunca incluye la contraseña)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    rol: Rol
    cargo: Cargo | None
    telefono: str | None
    creado: Milisegundos


class EmpleadoPublico(BaseModel):
    """Lo que un cliente puede saber del personal (para enviarle avisos); sin celular."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    rol: Rol
    cargo: Cargo | None


class DatosPersonales(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    telefono: str = Field(min_length=7, max_length=20)

    @field_validator("nombre", "telefono", mode="before")
    @classmethod
    def sin_espacios_extra(cls, valor: str) -> str:
        return valor.strip() if isinstance(valor, str) else valor


class ClienteNuevo(DatosPersonales):
    """Cliente que registra el personal en caja (con contraseña temporal)."""


class PerfilEntrada(DatosPersonales):
    """Datos que cada usuario edita en su perfil."""


class CambioPassword(BaseModel):
    actual: str = Field(min_length=1)
    nueva: str = Field(min_length=6)


class CambioCargo(BaseModel):
    cargo: Cargo
