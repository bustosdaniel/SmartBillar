from fastapi import APIRouter, HTTPException, status

from app.deps import BaseDeDatos, UsuarioActual
from app.schemas.auth import LoginEntrada, RegistroEntrada, SesionSalida
from app.schemas.usuarios import UsuarioSalida
from app.seguridad import crear_token
from app.services.usuarios import ErrorDeDatos, autenticar, registrar_cliente

router = APIRouter(prefix="/auth", tags=["autenticación"])


@router.post("/login", response_model=SesionSalida)
def login(datos: LoginEntrada, db: BaseDeDatos):
    """Devuelve un token para enviar en `Authorization: Bearer <token>` en las demás peticiones."""
    usuario = autenticar(db, datos.email, datos.password)
    if usuario is None:
        # El mismo mensaje para correo inexistente o contraseña errada: no revela qué cuentas existen.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    return SesionSalida(token=crear_token(usuario.id), usuario=UsuarioSalida.model_validate(usuario))


@router.post("/registro", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroEntrada, db: BaseDeDatos):
    """Crea una cuenta de cliente y deja la sesión iniciada. Avisa a los administradores."""
    try:
        cliente = registrar_cliente(db, **datos.model_dump())
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
    db.commit()
    return SesionSalida(token=crear_token(cliente.id), usuario=UsuarioSalida.model_validate(cliente))


@router.get("/yo", response_model=UsuarioSalida)
def yo(usuario: UsuarioActual):
    """El usuario dueño del token (para restaurar la sesión al recargar la página)."""
    return usuario
