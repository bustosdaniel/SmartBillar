from collections.abc import Callable

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import Administrador, BaseDeDatos, Cliente, Empleado, UsuarioActual
from app.schemas.torneos import (
    CobroEntrada,
    GanadorEntrada,
    InscripcionEntrada,
    MesaPartidoEntrada,
    TorneoEntrada,
    TorneoSalida,
)
from app.services import torneos as servicio
from app.services.usuarios import ErrorDeDatos

router = APIRouter(prefix="/torneos", tags=["torneos"])


def _ejecutar(db: Session, operacion: Callable, *args, **datos):
    """Guarda solo si toda la operación salió bien (cobro, inscripción y avisos van juntos)."""
    try:
        resultado = operacion(db, *args, **datos)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
    db.commit()
    return resultado


def _pago(datos: CobroEntrada) -> tuple:
    return (datos.pago.metodo, datos.pago.recibido) if datos.pago else (None, None)


@router.get("", response_model=list[TorneoSalida])
def listar(db: BaseDeDatos, usuario: UsuarioActual):
    return servicio.listar(db, usuario)


@router.post("", status_code=status.HTTP_201_CREATED)
def crear(datos: TorneoEntrada, db: BaseDeDatos, _admin: Administrador) -> dict[str, int]:
    return {"id": _ejecutar(db, servicio.crear, **datos.model_dump()).id}


@router.post("/{torneo_id}/inscripciones", status_code=status.HTTP_204_NO_CONTENT)
def inscribir(torneo_id: int, datos: InscripcionEntrada, db: BaseDeDatos, _empleado: Empleado):
    """Administrador o cajero: inscribe y cobra en una sola transacción."""
    _ejecutar(db, servicio.inscribir, torneo_id, datos.cliente_id, *_pago(datos))


@router.post("/{torneo_id}/mi-inscripcion", status_code=status.HTTP_204_NO_CONTENT)
def inscribirme(torneo_id: int, db: BaseDeDatos, cliente: Cliente):
    _ejecutar(db, servicio.inscribirme, torneo_id, cliente)


@router.delete("/{torneo_id}/mi-inscripcion", status_code=status.HTTP_204_NO_CONTENT)
def retirarme(torneo_id: int, db: BaseDeDatos, cliente: Cliente):
    _ejecutar(db, servicio.retirarme, torneo_id, cliente)


@router.post("/{torneo_id}/jugadores/{jugador_id}/cobro", status_code=status.HTTP_204_NO_CONTENT)
def cobrar(torneo_id: int, jugador_id: int, datos: CobroEntrada, db: BaseDeDatos, _empleado: Empleado):
    _ejecutar(db, servicio.cobrar_pendiente, torneo_id, jugador_id, *_pago(datos))


@router.delete("/{torneo_id}/jugadores/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar(torneo_id: int, jugador_id: int, db: BaseDeDatos, _admin: Administrador, devolver: bool = False):
    _ejecutar(db, servicio.quitar, torneo_id, jugador_id, devolver)


@router.post("/{torneo_id}/iniciar", status_code=status.HTTP_204_NO_CONTENT)
def iniciar(torneo_id: int, db: BaseDeDatos, _admin: Administrador):
    _ejecutar(db, servicio.iniciar, torneo_id)


@router.put("/{torneo_id}/partidos/{partido_id}/mesa", status_code=status.HTTP_204_NO_CONTENT)
def asignar_mesa(torneo_id: int, partido_id: int, datos: MesaPartidoEntrada, db: BaseDeDatos, _admin: Administrador):
    _ejecutar(db, servicio.asignar_mesa, torneo_id, partido_id, datos.mesa_id)


@router.put("/{torneo_id}/partidos/{partido_id}/ganador", status_code=status.HTTP_204_NO_CONTENT)
def registrar_ganador(torneo_id: int, partido_id: int, datos: GanadorEntrada, db: BaseDeDatos, _admin: Administrador):
    _ejecutar(db, servicio.registrar_ganador, torneo_id, partido_id, datos.jugador_id)
