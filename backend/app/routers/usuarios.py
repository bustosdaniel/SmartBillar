from fastapi import APIRouter, HTTPException, Response, status

from app.deps import Administrador, BaseDeDatos, Empleado, UsuarioActual
from app.schemas.usuarios import (
    CambioCargo,
    CambioPassword,
    ClienteNuevo,
    EmpleadoPublico,
    PerfilEntrada,
    UsuarioSalida,
)
from app.services import usuarios as servicio
from app.services.usuarios import ErrorDeDatos

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _conflicto(error: ErrorDeDatos) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, str(error))


@router.get("", response_model=list[UsuarioSalida])
def listar(db: BaseDeDatos, _empleado: Empleado):
    """Clientes y empleados (solo personal del club)."""
    return servicio.listar_usuarios(db)


@router.get("/empleados", response_model=list[EmpleadoPublico])
def empleados(db: BaseDeDatos, _usuario: UsuarioActual):
    """El personal del club: cualquier usuario con sesión lo puede ver (para los avisos)."""
    return servicio.listar_empleados(db)


@router.get("/cedula/{cedula}", response_model=UsuarioSalida)
def por_cedula(cedula: str, db: BaseDeDatos, _empleado: Empleado):
    """Busca un cliente por cédula (con o sin puntos), como en caja al iniciar una mesa."""
    cliente = servicio.buscar_cliente_por_cedula(db, cedula)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No se encontró al cliente, intente de nuevo o regístrelo.")
    return cliente


@router.post("/clientes", response_model=UsuarioSalida, status_code=status.HTTP_201_CREATED)
def registrar_cliente(datos: ClienteNuevo, db: BaseDeDatos, _empleado: Empleado):
    """El personal registra un cliente en caja. Queda con la contraseña temporal 123456."""
    try:
        cliente = servicio.registrar_cliente(db, **datos.model_dump(), avisar=False)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return cliente


@router.patch("/yo", response_model=UsuarioSalida)
def actualizar_perfil(datos: PerfilEntrada, db: BaseDeDatos, usuario: UsuarioActual):
    try:
        servicio.actualizar_perfil(db, usuario, **datos.model_dump())
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return usuario


@router.put("/yo/password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_password(datos: CambioPassword, db: BaseDeDatos, usuario: UsuarioActual):
    try:
        servicio.cambiar_password(usuario, datos.actual, datos.nueva)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{usuario_id}/cargo", response_model=UsuarioSalida)
def cambiar_cargo(usuario_id: int, datos: CambioCargo, db: BaseDeDatos, _admin: Administrador):
    """Administrador o cajero (solo un administrador puede cambiarlo)."""
    try:
        empleado = servicio.cambiar_cargo(db, usuario_id, datos.cargo)
    except ErrorDeDatos as error:
        raise _conflicto(error) from error
    db.commit()
    return empleado
