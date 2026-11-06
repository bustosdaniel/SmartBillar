"""Dependencias de FastAPI para saber quién hace la petición y qué puede hacer (control por roles)."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import obtener_db
from app.models import Usuario
from app.models.enums import Cargo, Rol
from app.seguridad import leer_token

_bearer = HTTPBearer(auto_error=False)

BaseDeDatos = Annotated[Session, Depends(obtener_db)]


def usuario_actual(
    db: BaseDeDatos, credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> Usuario:
    usuario_id = leer_token(credenciales.credentials) if credenciales else None
    usuario = db.get(Usuario, usuario_id) if usuario_id is not None else None
    if usuario is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Tu sesión no es válida o venció. Inicia sesión de nuevo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def cliente(usuario: UsuarioActual) -> Usuario:
    if usuario.rol != Rol.CLIENTE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta opción es solo para clientes.")
    return usuario


def empleado(usuario: UsuarioActual) -> Usuario:
    """Administrador o cajero."""
    if usuario.rol != Rol.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el personal del club puede hacer esto.")
    return usuario


def administrador(usuario: UsuarioActual) -> Usuario:
    """Solo el cargo administrador (no el cajero)."""
    if usuario.rol != Rol.ADMIN or usuario.cargo != Cargo.ADMINISTRADOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un administrador puede hacer esto.")
    return usuario


Cliente = Annotated[Usuario, Depends(cliente)]
Empleado = Annotated[Usuario, Depends(empleado)]
Administrador = Annotated[Usuario, Depends(administrador)]
