from pydantic import BaseModel, EmailStr, Field

from app.schemas.usuarios import ClienteNuevo, UsuarioSalida


class LoginEntrada(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegistroEntrada(ClienteNuevo):
    """El cliente crea su propia cuenta desde la app."""

    password: str = Field(min_length=6, description="Mínimo 6 caracteres.")


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioSalida
