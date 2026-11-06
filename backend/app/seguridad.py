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


def crear_token(usuario_id: int) -> str:
    vence = ahora_utc() + timedelta(hours=configuracion.jwt_horas)
    return jwt.encode({"sub": str(usuario_id), "exp": vence}, configuracion.jwt_secreto, algorithm=ALGORITMO)


def leer_token(token: str) -> int | None:
    """Devuelve el id del usuario, o None si el token es inválido o venció."""
    try:
        datos = jwt.decode(token, configuracion.jwt_secreto, algorithms=[ALGORITMO])
        return int(datos["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
