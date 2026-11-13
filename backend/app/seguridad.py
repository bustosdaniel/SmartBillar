"""Contraseñas con bcrypt y tokens de sesión (JWT). Requisito no funcional de seguridad del documento."""

from datetime import timedelta

import bcrypt
import jwt

from app.config import configuracion
from app.tiempo import ahora_utc

ALGORITMO = "HS256"


def encriptar_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        # Hash con formato inválido (por ejemplo, un dato de prueba mal cargado).
        return False


def crear_token(usuario_id: int, version: int = 0) -> str:
    """`version` es Usuario.version_sesion: al cambiar la contraseña sube y este token deja de servir."""
    vence = ahora_utc() + timedelta(hours=configuracion.jwt_horas)
    datos = {"sub": str(usuario_id), "ver": version, "exp": vence}
    return jwt.encode(datos, configuracion.jwt_secreto, algorithm=ALGORITMO)


def leer_token(token: str) -> tuple[int, int] | None:
    """Devuelve (id del usuario, versión de sesión), o None si el token es inválido o venció. Los tokens
    anteriores a la versión no la traen y cuentan como versión 0."""
    try:
        datos = jwt.decode(token, configuracion.jwt_secreto, algorithms=[ALGORITMO])
        return int(datos["sub"]), int(datos.get("ver", 0))
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        return None
