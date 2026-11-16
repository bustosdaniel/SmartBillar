import re
from string import digits
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Cargo, Rol
from app.schemas.celular import normalizar_celular
from app.schemas.comun import Milisegundos

# Las mismas reglas están en frontend/src/auth/validaciones.ts.
PATRON_NOMBRE = re.compile(r"[^\W\d_]+(?:[ '.-]+[^\W\d_]+)*")
# usuario@dominio.ext: la terminación es de letras (.com, .co, .edu.co…); después de ".com" solo
# puede ir el país (.com.co) y nada más.
PATRON_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,6}")


def correo_valido(correo: str) -> bool:
    if not PATRON_EMAIL.fullmatch(correo) or ".." in correo:
        return False
    dominio = correo.rsplit("@", 1)[1].lower()
    etiquetas = dominio.split(".")
    if "com" not in etiquetas[1:]:
        return True
    despues = etiquetas[etiquetas.index("com", 1) + 1 :]
    return despues == [] or (len(despues) == 1 and len(despues[0]) == 2)
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
    primer_nombre: str | None
    segundo_nombre: str | None
    primer_apellido: str | None
    segundo_apellido: str | None
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


LARGO_MINIMO_PARTE_NOMBRE = 2
LARGO_MAXIMO_PARTE_NOMBRE = 25
ParteNombre = Annotated[str, Field(min_length=LARGO_MINIMO_PARTE_NOMBRE, max_length=LARGO_MAXIMO_PARTE_NOMBRE)]


class DatosPersonales(BaseModel):
    primer_nombre: ParteNombre
    # Opcional: llega vacío o no llega.
    segundo_nombre: str = Field(default="", max_length=LARGO_MAXIMO_PARTE_NOMBRE)
    primer_apellido: ParteNombre
    segundo_apellido: ParteNombre
    email: EmailStr = Field(max_length=160)
    telefono: str = Field(min_length=1)

    @field_validator("primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "telefono", mode="before")
    @classmethod
    def sin_espacios_extra(cls, valor: str | None) -> str:
        if valor is None:
            return ""
        return " ".join(valor.split()) if isinstance(valor, str) else valor

    @field_validator("primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido")
    @classmethod
    def solo_letras(cls, valor: str) -> str:
        if valor and not PATRON_NOMBRE.fullmatch(valor):
            raise ValueError("Los nombres y apellidos solo pueden tener letras.")
        return valor

    @field_validator("segundo_nombre")
    @classmethod
    def segundo_nombre_completo(cls, valor: str) -> str:
        if valor and len(valor) < LARGO_MINIMO_PARTE_NOMBRE:
            raise ValueError(f"El segundo nombre debe tener al menos {LARGO_MINIMO_PARTE_NOMBRE} letras.")
        return valor

    @field_validator("email")
    @classmethod
    def correo_con_terminacion(cls, valor: str) -> str:
        if not correo_valido(valor):
            raise ValueError("El correo no es válido.")
        return valor

    @field_validator("telefono")
    @classmethod
    def celular_valido(cls, valor: str) -> str:
        return normalizar_celular(valor)


class ClienteNuevo(DatosPersonales):
    """Cliente que registra el personal en caja (con contraseña temporal)."""


class PerfilEntrada(DatosPersonales):
    """Datos que cada usuario edita en su perfil. `actual` (la contraseña) solo se exige si cambia el correo."""

    actual: str | None = None


class CambioPassword(BaseModel):
    actual: str = Field(min_length=1)
    nueva: PasswordNueva


class CambioCargo(BaseModel):
    cargo: Cargo
