from pydantic import BaseModel, EmailStr, Field

from app.schemas.usuarios import ClienteNuevo, PasswordNueva, UsuarioSalida


class LoginEntrada(BaseModel):
    email: EmailStr = Field(max_length=160)
    # Tope generoso: las contraseñas nuevas tienen máximo 72 bytes; esto solo evita cuerpos gigantes.
    password: str = Field(min_length=1, max_length=200)


class RegistroEntrada(ClienteNuevo):
    """El cliente crea su propia cuenta desde la app."""

    password: PasswordNueva


class RecuperarEntrada(BaseModel):
    email: EmailStr


class RestablecerEntrada(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    nueva: PasswordNueva


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioSalida
