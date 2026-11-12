from collections.abc import Callable

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import Administrador, BaseDeDatos, Empleado, UsuarioActual
from app.schemas.mesas import (
    CobrarEntrada,
    CobroSalida,
    ConsumoEntrada,
    IniciarEntrada,
    MesaEntrada,
    MesaSalida,
    PreciosEntrada,
    ProductoSalida,
    SesionFinalizadaSalida,
    SesionSalida,
    TarifasEntrada,
    TarifasSalida,
)
from app.services import mesas as servicio
from app.services.usuarios import ErrorDeDatos

router = APIRouter(prefix="/mesas", tags=["mesas"])


def _ejecutar(db: Session, operacion: Callable, *args, **datos):
    """Guarda solo si toda la operación salió bien (cobro, cierre de la sesión y avisos van juntos)."""
    try:
        resultado = operacion(db, *args, **datos)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
    db.commit()
    return resultado


def _sesion(sesion) -> SesionSalida:
    return SesionSalida.model_validate(servicio.sesion_salida(sesion))


# ---------- Catálogo: cualquiera con sesión lo ve; solo el administrador cambia precios ----------


@router.get("", response_model=list[MesaSalida])
def mesas(db: BaseDeDatos, _usuario: UsuarioActual):
    return servicio.listar_mesas(db)


@router.post("", response_model=MesaSalida, status_code=status.HTTP_201_CREATED)
def crear_mesa(datos: MesaEntrada, db: BaseDeDatos, _admin: Administrador):
    mesa = _ejecutar(db, servicio.crear_mesa, datos.nombre, datos.modo)
    return {"id": mesa.id, "nombre": mesa.nombre, "modo": mesa.modo, "retirada": False}


@router.delete("/{mesa_id}")
def eliminar_mesa(mesa_id: int, db: BaseDeDatos, _admin: Administrador) -> dict[str, str]:
    """Responde {"modo": "borrada"} si nunca se usó, o {"modo": "retirada"} si se conservó su historial."""
    return {"modo": _ejecutar(db, servicio.eliminar_mesa, mesa_id)}


@router.get("/tarifas", response_model=TarifasSalida)
def tarifas(db: BaseDeDatos, _usuario: UsuarioActual):
    return servicio.tarifas(db)


@router.put("/tarifas", response_model=TarifasSalida)
def guardar_tarifas(datos: TarifasEntrada, db: BaseDeDatos, _admin: Administrador):
    reglas = [r.model_dump(exclude={"id"}) for r in datos.reglas]
    por_modo = {modo: precio.model_dump() for modo, precio in datos.por_modo.items()}
    return _ejecutar(db, servicio.guardar_tarifas, por_modo, reglas)


@router.get("/productos", response_model=list[ProductoSalida])
def productos(db: BaseDeDatos, _usuario: UsuarioActual):
    return servicio.listar_productos(db)


@router.put("/productos/precios", response_model=list[ProductoSalida])
def guardar_precios(datos: PreciosEntrada, db: BaseDeDatos, _admin: Administrador):
    return _ejecutar(db, servicio.actualizar_precios, datos.precios)


# ---------- Sesiones ----------


@router.get("/sesiones", response_model=list[SesionSalida])
def sesiones_activas(db: BaseDeDatos, usuario: UsuarioActual):
    """Todas las mesas en juego. A un cliente solo se le muestra quién juega en la suya."""
    return servicio.listar_activas(db, usuario)


@router.get("/sesiones/finalizadas", response_model=list[SesionFinalizadaSalida])
def sesiones_finalizadas(db: BaseDeDatos, usuario: UsuarioActual):
    """El personal ve todas; un cliente, solo las suyas (su historial)."""
    return servicio.listar_finalizadas(db, usuario)


@router.post("/{mesa_id}/sesion", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
def iniciar(mesa_id: int, datos: IniciarEntrada, db: BaseDeDatos, _empleado: Empleado):
    return _sesion(_ejecutar(db, servicio.iniciar, mesa_id, datos.cliente_id))


@router.post("/{mesa_id}/pausar", response_model=SesionSalida)
def pausar(mesa_id: int, db: BaseDeDatos, _empleado: Empleado):
    return _sesion(_ejecutar(db, servicio.pausar, mesa_id))


@router.post("/{mesa_id}/reanudar", response_model=SesionSalida)
def reanudar(mesa_id: int, db: BaseDeDatos, _empleado: Empleado):
    """Quita la pausa, o vuelve a poner en juego una mesa finalizada por error."""
    return _sesion(_ejecutar(db, servicio.reanudar, mesa_id))


@router.post("/{mesa_id}/detener", response_model=SesionSalida)
def detener(mesa_id: int, db: BaseDeDatos, _empleado: Empleado):
    return _sesion(_ejecutar(db, servicio.detener, mesa_id))


@router.post("/{mesa_id}/consumos", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
def agregar_consumo(mesa_id: int, datos: ConsumoEntrada, db: BaseDeDatos, _empleado: Empleado):
    return _sesion(_ejecutar(db, servicio.agregar_consumo, mesa_id, datos.producto_id, datos.cantidad))


@router.delete("/{mesa_id}/consumos/{consumo_id}", response_model=SesionSalida)
def quitar_consumo(mesa_id: int, consumo_id: int, db: BaseDeDatos, _empleado: Empleado):
    return _sesion(_ejecutar(db, servicio.quitar_consumo, mesa_id, consumo_id))


@router.post("/{mesa_id}/cobrar", response_model=CobroSalida)
def cobrar(mesa_id: int, datos: CobrarEntrada, db: BaseDeDatos, _empleado: Empleado):
    """Cobra el total que calcula el servidor y deja la mesa libre, en una sola transacción."""
    pago, sesion, cuenta = _ejecutar(db, servicio.cobrar, mesa_id, datos.pago.metodo, datos.pago.recibido)
    return {
        "pago": pago,
        "sesion": servicio.sesion_salida(sesion) | {"metodo_pago": pago.metodo},
        "cuenta": vars(cuenta),
    }
