import re
from string import digits
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Cargo, Rol
from app.schemas.comun import Milisegundos

# Las mismas reglas están en frontend/src/auth/validaciones.ts.
PATRON_NOMBRE = re.compile(r"[^\W\d_]+(?:[ '.-]+[^\W\d_]+)*")
# Celular colombiano: 10 dígitos que empiezan por 3, con o sin indicativo 57.
PATRON_CELULAR = re.compile(r"(?:\+?57)?(3[0-9]{9})")
LARGO_MINIMO_PASSWORD = 8
# bcrypt rechaza con una excepción las contraseñas de más de 72 bytes.
BYTES_MAXIMOS_PASSWORD = 72


def _validar_password_nueva(valor: str) -> str:
    if len(valor.encode()) > BYTES_MAXIMOS_PASSWORD:
        raise ValueError(f"La contraseña no puede tener más de {BYTES_MAXIMOS_PASSWORD} caracteres.")
    if (
        len(valor) < LARGO_MINIMO_PASSWORD
        or not any(c.isupper() for c in valor)
        or not any(c.islower() for c in valor)
        or not any(c in digits for c in valor)
        or not any(not c.isalnum() and not c.isspace() for c in valor)
    ):
        raise ValueError(
            "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial."
        )
    return valor


# Solo para contraseñas que se crean: las de login y la "actual" no se validan (hay cuentas con la temporal).
PasswordNueva = Annotated[str, Field(min_length=1), AfterValidator(_validar_password_nueva)]


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
    nombre: str = Field(min_length=3, max_length=120)
    email: EmailStr = Field(max_length=160)
    telefono: str = Field(min_length=1)

    @field_validator("nombre", "telefono", mode="before")
    @classmethod
    def sin_espacios_extra(cls, valor: str) -> str:
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, valor: str) -> str:
        if not PATRON_NOMBRE.fullmatch(valor):
            raise ValueError("El nombre solo puede tener letras y espacios.")
        return valor

    @field_validator("telefono")
    @classmethod
    def celular_valido(cls, valor: str) -> str:
        celular = PATRON_CELULAR.fullmatch(re.sub(r"[\s-]", "", valor))
        if celular is None:
            raise ValueError("El celular debe tener 10 dígitos y empezar por 3.")
        return celular.group(1)


class ClienteNuevo(DatosPersonales):
    """Cliente que registra el personal en caja (con contraseña temporal)."""


class PerfilEntrada(DatosPersonales):
    """Datos que cada usuario edita en su perfil."""


class CambioPassword(BaseModel):
    actual: str = Field(min_length=1)
    nueva: PasswordNueva


class CambioCargo(BaseModel):
    cargo: Cargo
