from pydantic import BaseModel, EmailStr, Field

from app.schemas.usuarios import ClienteNuevo, PasswordNueva, UsuarioSalida


class LoginEntrada(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegistroEntrada(ClienteNuevo):
    """El cliente crea su propia cuenta desde la app."""

    password: PasswordNueva


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioSalida
