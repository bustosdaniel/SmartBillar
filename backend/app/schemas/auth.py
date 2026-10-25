from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Cargo, Rol
from app.schemas.comun import Milisegundos
from app.services.usuarios import normalizar_cedula


class UsuarioSalida(BaseModel):
    """Mismos campos que el tipo Usuario de frontend/src/types.ts (nunca incluye la contraseña)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    rol: Rol
    cargo: Cargo | None
    telefono: str | None
    cedula: str | None
    creado: Milisegundos


class LoginEntrada(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegistroEntrada(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    telefono: str = Field(min_length=7, max_length=20)
    cedula: str
    password: str = Field(min_length=6, description="Mínimo 6 caracteres.")

    @field_validator("nombre", "telefono")
    @classmethod
    def sin_espacios_extra(cls, valor: str) -> str:
        return valor.strip()

    @field_validator("cedula")
    @classmethod
    def cedula_valida(cls, valor: str) -> str:
        cedula = normalizar_cedula(valor)
        if not 5 <= len(cedula) <= 20:
            raise ValueError("La cédula debe tener entre 5 y 20 dígitos.")
        return cedula


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioSalida
