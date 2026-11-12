"""Mesas: catálogo (mesas, tarifas, productos), sesiones de juego, consumos y el cobro.

El backend es la fuente de verdad de lo que se cobra: calcula la cuenta (tiempo, tarifa congelada al
iniciar, horas gratis y descuentos de la membresía, consumos) y la cobra en la misma transacción que
cierra la sesión. El frontend repite el cálculo (frontend/src/mesas/cuenta.ts) solo para mostrar el
cronómetro y el total en vivo: las dos versiones deben dar lo mismo."""

import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Consumo,
    Membresia,
    Mesa,
    Movimiento,
    Pago,
    Partido,
    Plan,
    Producto,
    ReglaHorario,
    SesionMesa,
    TarifaModo,
    Torneo,
    Usuario,
)
from app.models.enums import EstadoTorneo, MetodoPago, ModoJuego, Rol, TipoMovimiento, TipoNotificacion
from app.schemas.comun import PRECIO_PRODUCTO
from app.services import caja
from app.services.caja import pesos
from app.services.notificaciones import notificar
from app.services.usuarios import ErrorDeDatos
from app.tiempo import ZONA_CLUB, ahora_utc

HORA_MS = 60 * 60 * 1000


def _ms(delta: timedelta) -> int:
    return int(delta.total_seconds() * 1000)


def _centena(valor: float) -> int:
    """Redondea a la centena como Math.round del frontend (las mitades hacia arriba, no al par)."""
    return int(math.floor(valor / 100 + 0.5)) * 100


def _hora_club(fecha: datetime) -> datetime:
    return fecha.replace(tzinfo=UTC).astimezone(ZONA_CLUB)


def _duracion(ms: int) -> str:
    total = ms // 1000
    return f"{total // 3600:02d}:{total % 3600 // 60:02d}:{total % 60:02d}"


# ---------- Catálogo ----------


NOMBRES_MODO = {ModoJuego.POOL: "Pool", ModoJuego.TRES_BANDAS: "Tres Bandas", ModoJuego.LIBRE: "Libre"}

# Mesas que se pueden usar (las retiradas solo quedan para el historial).
ACTIVA = Mesa.retirada_en.is_(None)


def listar_mesas(db: Session) -> list[dict]:
    """Todas, con las retiradas marcadas: el frontend las necesita para mostrar el historial."""
    return [
        {"id": m.id, "nombre": m.nombre, "modo": m.modo, "retirada": m.retirada_en is not None}
        for m in db.scalars(select(Mesa).order_by(Mesa.id))
    ]


def mesas_activas_de_modo(db: Session, modo: ModoJuego) -> int:
    return len(list(db.scalars(select(Mesa.id).where(Mesa.modo == modo, ACTIVA))))


def _mesa(db: Session, mesa_id: int) -> Mesa:
    mesa = db.get(Mesa, mesa_id)
    if mesa is None or mesa.retirada_en is not None:
        raise ErrorDeDatos("Esa mesa no existe.")
    return mesa


def crear_mesa(db: Session, nombre: str, modo: ModoJuego) -> Mesa:
    """Solo el administrador. El nombre no se repite entre las mesas activas."""
    if db.scalar(select(Mesa.id).where(Mesa.nombre == nombre, ACTIVA)) is not None:
        raise ErrorDeDatos(f"Ya hay una mesa llamada «{nombre}».")
    if db.get(TarifaModo, modo) is None:
        raise ErrorDeDatos("Ese modo de juego no tiene tarifa configurada.")
    mesa = Mesa(nombre=nombre, modo=modo)
    db.add(mesa)
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Mesa agregada", detalle=f"{nombre} · {NOMBRES_MODO[modo]}"))
    db.flush()
    return mesa


def eliminar_mesa(db: Session, mesa_id: int) -> str:
    """Solo el administrador. Si nunca se usó, se borra; si tiene historial (partidas o partidos de torneo),
    se retira para que los reportes y el historial la sigan mostrando. Devuelve "borrada" o "retirada"."""
    mesa = _mesa(db, mesa_id)
    if db.scalar(select(SesionMesa.id).where(SesionMesa.mesa_id == mesa.id, SesionMesa.fin.is_(None))) is not None:
        raise ErrorDeDatos(f"La {mesa.nombre} está en juego. Cóbrala antes de eliminarla.")
    pendientes = select(Torneo.id).where(Torneo.modo == mesa.modo, Torneo.estado != EstadoTorneo.FINALIZADO)
    en_partido = db.scalar(
        select(Partido.id).where(Partido.mesa_id == mesa.id, Partido.ganador_id.is_(None), Partido.torneo_id.in_(pendientes))
    )
    if en_partido is not None:
        raise ErrorDeDatos(f"La {mesa.nombre} está asignada a un partido de torneo. Cámbiala de mesa primero.")
    if mesas_activas_de_modo(db, mesa.modo) <= 1:
        torneo = db.scalar(select(Torneo.nombre).where(Torneo.id.in_(pendientes)))
        if torneo is not None:
            raise ErrorDeDatos(
                f"Es la única mesa de {NOMBRES_MODO[mesa.modo]} y el torneo «{torneo}» la necesita."
            )
    usada = db.scalar(select(SesionMesa.id).where(SesionMesa.mesa_id == mesa.id).limit(1)) is not None or (
        db.scalar(select(Partido.id).where(Partido.mesa_id == mesa.id).limit(1)) is not None
    )
    if usada:
        mesa.retirada_en = ahora_utc()
        modo = "retirada"
    else:
        db.delete(mesa)
        modo = "borrada"
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Mesa eliminada", detalle=f"{mesa.nombre} · {NOMBRES_MODO[mesa.modo]}"))
    db.flush()
    return modo


def listar_productos(db: Session) -> list[Producto]:
    return list(db.scalars(select(Producto).order_by(Producto.categoria, Producto.nombre)))


def actualizar_precios(db: Session, precios: dict[str, int]) -> list[Producto]:
    """Lo ya pedido en una mesa conserva el precio con el que se pidió (Consumo.precio)."""
    for producto_id, precio in precios.items():
        producto = db.get(Producto, producto_id)
        if producto is None:
            raise ErrorDeDatos("Ese producto no existe.")
        minimo, maximo = PRECIO_PRODUCTO[producto.categoria.value]
        if not minimo <= precio <= maximo:
            raise ErrorDeDatos(f"El precio de {producto.nombre} debe estar entre {pesos(minimo)} y {pesos(maximo)}.")
        producto.precio = precio
    db.add(Movimiento(tipo=TipoMovimiento.CONSUMO, titulo="Precios actualizados", detalle="Bebidas y paquetes"))
    db.flush()
    return listar_productos(db)


def tarifas(db: Session) -> dict:
    return {
        "por_modo": {t.modo: {"hora": t.hora} for t in db.scalars(select(TarifaModo))},
        "reglas": list(db.scalars(select(ReglaHorario).order_by(ReglaHorario.id))),
    }


def guardar_tarifas(db: Session, por_modo: dict, reglas: list[dict]) -> dict:
    """Reemplaza la configuración. Las mesas en juego conservan la tarifa con la que empezaron."""
    for modo, precio in por_modo.items():
        tarifa = db.get(TarifaModo, modo)
        if tarifa is None:
            db.add(TarifaModo(modo=modo, hora=precio["hora"]))
        else:
            tarifa.hora = precio["hora"]
    for regla in db.scalars(select(ReglaHorario)):
        db.delete(regla)
    db.flush()
    for regla in reglas:
        db.add(ReglaHorario(**regla))
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Tarifas actualizadas", detalle=f"{len(reglas)} tarifas por horario"))
    db.flush()
    return tarifas(db)


def _regla_vigente(db: Session, fecha: datetime) -> ReglaHorario | None:
    """Misma regla que reglaVigente del frontend, en la hora del club. Si la franja cruza la
    medianoche, la parte de la madrugada pertenece al día anterior."""
    local = _hora_club(fecha)
    ahora = local.time().replace(second=0, microsecond=0)
    hoy = (local.weekday() + 1) % 7  # 0 = domingo, como Date.getDay()
    ayer = (hoy + 6) % 7
    for regla in db.scalars(select(ReglaHorario).order_by(ReglaHorario.id)):
        desde, hasta = regla.desde, regla.hasta
        if desde < hasta:
            if hoy in regla.dias and desde <= ahora < hasta:
                return regla
        elif (hoy in regla.dias and ahora >= desde) or (ayer in regla.dias and ahora < hasta):
            return regla
    return None


def _tarifa_al(db: Session, modo: ModoJuego, fecha: datetime) -> tuple[int, str | None]:
    base = db.get(TarifaModo, modo)
    if base is None:
        raise ErrorDeDatos("Esa mesa no tiene tarifa configurada.")
    regla = _regla_vigente(db, fecha)
    ajuste = regla.ajuste if regla else 0
    return _centena(base.hora * (100 + ajuste) / 100), (regla.nombre if regla else None)


# ---------- La cuenta ----------


@dataclass
class Cuenta:
    tarifa_hora: int
    tiempo_ms: int
    subtotal_mesa: int
    consumos: int
    subtotal: int
    plan_id: str | None
    gratis_ms: int
    valor_gratis: int
    porcentaje: int
    descuento: int
    porcentaje_bar: int
    descuento_bar: int
    total: int


def tiempo_jugado(sesion: SesionMesa, ahora: datetime) -> int:
    """El tiempo en pausa no se cobra, y tras pulsar Finalizar ya no corre."""
    hasta = sesion.detenida_en or sesion.pausada_desde or ahora
    return max(0, _ms(hasta - sesion.inicio) - sesion.pausado_ms)


def costo(tiempo_ms: int, tarifa_hora: int) -> int:
    """Se cobra por minuto iniciado, redondeado a la centena."""
    minutos = math.ceil(tiempo_ms / 60000)
    return _centena(minutos * tarifa_hora / 60)


def _plan_vigente(db: Session, cliente_id: int, fecha: datetime) -> Plan | None:
    membresia = db.get(Membresia, cliente_id)
    if membresia is None or membresia.vence <= fecha:
        return None
    return db.get(Plan, membresia.plan_id)


def _gratis_usado_en_mes(db: Session, cliente_id: int, fecha: datetime) -> int:
    """Horas gratis que el cliente ya gastó en el mes (de la hora del club) de `fecha`."""
    local = _hora_club(fecha)
    usado = 0
    for sesion in db.scalars(
        select(SesionMesa).where(SesionMesa.cliente_id == cliente_id, SesionMesa.fin.is_not(None))
    ):
        fin = _hora_club(sesion.fin)
        if (fin.year, fin.month) == (local.year, local.month):
            usado += sesion.gratis_ms or 0
    return usado


def calcular_cuenta(db: Session, sesion: SesionMesa, ahora: datetime) -> Cuenta:
    """Primero se descuentan las horas gratis del plan y luego el % sobre lo que queda. Los consumos
    llevan aparte el % de descuento en bar del plan."""
    hasta = sesion.detenida_en or ahora
    tiempo = tiempo_jugado(sesion, ahora)
    plan = _plan_vigente(db, sesion.cliente_id, hasta)
    disponible = plan.horas_gratis_mes * HORA_MS - _gratis_usado_en_mes(db, sesion.cliente_id, hasta) if plan else 0
    tarifa = sesion.tarifa_hora
    subtotal_mesa = costo(tiempo, tarifa)
    gratis = min(max(0, disponible), tiempo) if plan else 0
    valor_gratis = subtotal_mesa - costo(tiempo - gratis, tarifa)
    porcentaje = plan.descuento_mesa if plan else 0
    despues_de_gratis = subtotal_mesa - valor_gratis
    descuento = _centena(despues_de_gratis * porcentaje / 100)
    consumos = sum(c.precio * c.cantidad for c in sesion.consumos)
    porcentaje_bar = plan.descuento_bar if plan else 0
    descuento_bar = _centena(consumos * porcentaje_bar / 100)
    return Cuenta(
        tarifa_hora=tarifa,
        tiempo_ms=tiempo,
        subtotal_mesa=subtotal_mesa,
        consumos=consumos,
        subtotal=subtotal_mesa + consumos,
        plan_id=plan.id if plan else None,
        gratis_ms=gratis,
        valor_gratis=valor_gratis,
        porcentaje=porcentaje,
        descuento=descuento,
        porcentaje_bar=porcentaje_bar,
        descuento_bar=descuento_bar,
        total=despues_de_gratis - descuento + consumos - descuento_bar,
    )


# ---------- Sesiones ----------


def _consumo_salida(consumo: Consumo) -> dict:
    return {
        "id": consumo.id,
        "producto_id": consumo.producto_id,
        "nombre": consumo.nombre,
        "categoria": consumo.producto.categoria,
        "precio": consumo.precio,
        "cantidad": consumo.cantidad,
        "fecha": consumo.fecha,
    }


def sesion_salida(sesion: SesionMesa, ocultar_cliente: bool = False) -> dict:
    """A un cliente no se le muestra quién juega en las otras mesas ni qué pidió: solo que están ocupadas."""
    datos = {
        "id": sesion.id,
        "mesa_id": sesion.mesa_id,
        "cliente_id": None if ocultar_cliente else sesion.cliente_id,
        "cliente_nombre": "" if ocultar_cliente else sesion.cliente.nombre,
        "inicio": sesion.inicio,
        "pausado_ms": sesion.pausado_ms,
        "pausada_desde": sesion.pausada_desde,
        "detenida_en": sesion.detenida_en,
        "tarifa_hora": sesion.tarifa_hora,
        "regla": sesion.regla,
        "consumos": [] if ocultar_cliente else [_consumo_salida(c) for c in sesion.consumos],
    }
    if sesion.fin is not None:
        datos |= {
            "fin": sesion.fin,
            "tiempo_ms": sesion.tiempo_ms,
            "total": sesion.total,
            "subtotal": sesion.subtotal,
            "gratis_ms": sesion.gratis_ms,
            "descuento": sesion.descuento,
            "descuento_bar": sesion.descuento_bar,
            "plan_id": sesion.plan_id,
        }
    return datos


def listar_activas(db: Session, usuario: Usuario) -> list[dict]:
    activas = db.scalars(select(SesionMesa).where(SesionMesa.fin.is_(None)).order_by(SesionMesa.mesa_id))
    return [
        sesion_salida(s, ocultar_cliente=usuario.rol == Rol.CLIENTE and s.cliente_id != usuario.id) for s in activas
    ]


def listar_finalizadas(db: Session, usuario: Usuario) -> list[dict]:
    """El personal ve todas; un cliente, solo las suyas. Con el método del pago que la cerró."""
    consulta = select(SesionMesa).where(SesionMesa.fin.is_not(None)).order_by(SesionMesa.fin)
    if usuario.rol == Rol.CLIENTE:
        consulta = consulta.where(SesionMesa.cliente_id == usuario.id)
    sesiones = list(db.scalars(consulta))
    metodos = {
        p.sesion_id: p.metodo
        for p in db.scalars(
            select(Pago).where(Pago.sesion_id.in_([s.id for s in sesiones]), Pago.anulado_en.is_(None))
        )
    } if sesiones else {}
    return [sesion_salida(s) | {"metodo_pago": metodos.get(s.id)} for s in sesiones]


def _activa(db: Session, mesa_id: int) -> SesionMesa:
    sesion = db.scalar(select(SesionMesa).where(SesionMesa.mesa_id == mesa_id, SesionMesa.fin.is_(None)))
    if sesion is None:
        raise ErrorDeDatos(f"La Mesa {mesa_id} no tiene una sesión activa.")
    return sesion


def _movimiento(db: Session, tipo: TipoMovimiento, mesa: Mesa, detalle: str) -> None:
    db.add(Movimiento(tipo=tipo, titulo=mesa.nombre, detalle=detalle))


def iniciar(db: Session, mesa_id: int, cliente_id: int) -> SesionMesa:
    """Entregar las bolas: la tarifa (con la regla de horario de este momento) queda congelada."""
    mesa = _mesa(db, mesa_id)
    cliente = db.get(Usuario, cliente_id)
    if cliente is None or cliente.rol != Rol.CLIENTE or cliente.eliminado_en is not None:
        raise ErrorDeDatos("Ese cliente no existe.")
    if db.scalar(select(SesionMesa.id).where(SesionMesa.mesa_id == mesa_id, SesionMesa.fin.is_(None))):
        raise ErrorDeDatos(f"La {mesa.nombre} ya está ocupada.")
    otra = db.scalar(select(SesionMesa).where(SesionMesa.cliente_id == cliente_id, SesionMesa.fin.is_(None)))
    if otra is not None:
        raise ErrorDeDatos(f"{cliente.nombre} ya está jugando en la Mesa {otra.mesa_id}.")
    ahora = ahora_utc()
    tarifa, regla = _tarifa_al(db, mesa.modo, ahora)
    sesion = SesionMesa(mesa_id=mesa.id, cliente_id=cliente.id, inicio=ahora, pausado_ms=0, tarifa_hora=tarifa, regla=regla)
    db.add(sesion)
    _movimiento(db, TipoMovimiento.INICIO, mesa, f"Inicio de sesión · {cliente.nombre}")
    notificar(
        db,
        cliente.id,
        TipoNotificacion.MESA,
        f"Tu mesa está lista · {mesa.nombre}",
        "Ya empezó a contar tu tiempo. Síguelo en vivo desde Mi mesa. ¡Buen juego!",
        ruta="/cliente/mesa",
    )
    db.flush()
    return sesion


def pausar(db: Session, mesa_id: int) -> SesionMesa:
    sesion = _activa(db, mesa_id)
    if sesion.detenida_en is not None:
        raise ErrorDeDatos("La mesa ya está finalizada: cóbrala o reanúdala.")
    if sesion.pausada_desde is None:
        sesion.pausada_desde = ahora_utc()
        _movimiento(db, TipoMovimiento.PAUSA, sesion.mesa, "Sesión pausada")
    db.flush()
    return sesion


def reanudar(db: Session, mesa_id: int) -> SesionMesa:
    """Quita la pausa, o devuelve a juego una mesa finalizada por error (ese rato no se cobra)."""
    sesion = _activa(db, mesa_id)
    ahora = ahora_utc()
    if sesion.detenida_en is not None:
        sesion.pausado_ms += _ms(ahora - sesion.detenida_en)
        sesion.detenida_en = None
    elif sesion.pausada_desde is not None:
        sesion.pausado_ms += _ms(ahora - sesion.pausada_desde)
        sesion.pausada_desde = None
    else:
        return sesion
    _movimiento(db, TipoMovimiento.REANUDAR, sesion.mesa, "Sesión reanudada")
    db.flush()
    return sesion


def detener(db: Session, mesa_id: int) -> SesionMesa:
    """Finalizar congela el tiempo. Si estaba en pausa, la pausa se cierra en ese momento."""
    sesion = _activa(db, mesa_id)
    if sesion.detenida_en is not None:
        return sesion
    ahora = ahora_utc()
    if sesion.pausada_desde is not None:
        sesion.pausado_ms += _ms(ahora - sesion.pausada_desde)
        sesion.pausada_desde = None
    sesion.detenida_en = ahora
    _movimiento(db, TipoMovimiento.DETENER, sesion.mesa, "Tiempo detenido · por cobrar")
    db.flush()
    return sesion


def agregar_consumo(db: Session, mesa_id: int, producto_id: str, cantidad: int) -> SesionMesa:
    """El nombre y el precio quedan fijos al pedirlo."""
    sesion = _activa(db, mesa_id)
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise ErrorDeDatos("Ese producto no existe.")
    sesion.consumos.append(
        Consumo(producto_id=producto.id, nombre=producto.nombre, precio=producto.precio, cantidad=cantidad, fecha=ahora_utc())
    )
    valor = pesos(cantidad * producto.precio)
    _movimiento(db, TipoMovimiento.CONSUMO, sesion.mesa, f"{cantidad} × {producto.nombre} · {valor}")
    notificar(
        db,
        sesion.cliente_id,
        TipoNotificacion.MESA,
        f"Pedido agregado · {producto.nombre}",
        f"Sumamos {cantidad} × {producto.nombre} ({valor}) a la cuenta de tu mesa.",
        ruta="/cliente/consumos",
    )
    db.flush()
    return sesion


def quitar_consumo(db: Session, mesa_id: int, consumo_id: int) -> SesionMesa:
    """Para corregir un pedido registrado por error."""
    sesion = _activa(db, mesa_id)
    consumo = next((c for c in sesion.consumos if c.id == consumo_id), None)
    if consumo is None:
        raise ErrorDeDatos("Ese pedido ya no está en la cuenta de la mesa.")
    sesion.consumos.remove(consumo)
    _movimiento(db, TipoMovimiento.CONSUMO, sesion.mesa, f"Pedido quitado · {consumo.cantidad} × {consumo.nombre}")
    db.flush()
    return sesion


def cobrar(db: Session, mesa_id: int, metodo: MetodoPago, recibido: int | None) -> tuple[Pago, SesionMesa, Cuenta]:
    """Cobra la cuenta que calcula el servidor y cierra la sesión en la misma transacción: si el cobro
    falla (caja cerrada, efectivo insuficiente), la mesa sigue Por cobrar."""
    sesion = _activa(db, mesa_id)
    if sesion.detenida_en is None:
        raise ErrorDeDatos("Primero pulsa Finalizar para detener el tiempo.")
    cuenta = calcular_cuenta(db, sesion, sesion.detenida_en)
    pago = caja.registrar_pago(
        db,
        concepto=sesion.mesa.nombre,
        cliente=sesion.cliente.nombre,
        cliente_id=sesion.cliente_id,
        monto=cuenta.total,
        metodo=metodo,
        recibido=recibido,
        sesion_id=sesion.id,
    )
    sesion.fin = sesion.detenida_en
    sesion.tiempo_ms, sesion.subtotal, sesion.gratis_ms = cuenta.tiempo_ms, cuenta.subtotal, cuenta.gratis_ms
    sesion.descuento, sesion.descuento_bar, sesion.total = cuenta.descuento, cuenta.descuento_bar, cuenta.total
    sesion.plan_id = cuenta.plan_id
    _movimiento(db, TipoMovimiento.FIN, sesion.mesa, f"Sesión finalizada · {pesos(cuenta.total)}")
    ahorro = cuenta.subtotal - cuenta.total
    notificar(
        db,
        sesion.cliente_id,
        TipoNotificacion.FACTURA,
        f"Recibo de pago · {sesion.mesa.nombre}",
        f"Jugaste {_duracion(cuenta.tiempo_ms)}. "
        + (f"Consumos: {pesos(cuenta.consumos)}. " if cuenta.consumos > 0 else "")
        + f"Total pagado: {pesos(cuenta.total)}"
        + (f" (ahorraste {pesos(ahorro)} con tu membresía)" if ahorro > 0 else "")
        + ".",
        ruta="/cliente/historial",
    )
    db.flush()
    return pago, sesion, cuenta


def reabrir_por_anulacion(db: Session, pago: Pago) -> None:
    """El datáfono o el banco rechazó el cobro de una mesa: la sesión vuelve a Por cobrar con el mismo
    tiempo y consumos (detenida_en sigue siendo el fin, así el tiempo no corre)."""
    sesion = db.get(SesionMesa, pago.sesion_id)
    if sesion is None or sesion.fin is None:
        return
    if db.scalar(select(SesionMesa.id).where(SesionMesa.mesa_id == sesion.mesa_id, SesionMesa.fin.is_(None))):
        raise ErrorDeDatos(f"La {sesion.mesa.nombre} ya tiene otra sesión. Finalízala antes de anular este cobro.")
    sesion.fin = None
    sesion.tiempo_ms = sesion.subtotal = sesion.gratis_ms = None
    sesion.descuento = sesion.descuento_bar = sesion.total = None
    sesion.plan_id = None
    notificar(
        db,
        sesion.cliente_id,
        TipoNotificacion.FACTURA,
        f"Cobro anulado · {sesion.mesa.nombre}",
        f"El pago con {caja.NOMBRES_METODO[pago.metodo].lower()} de {pesos(pago.monto)} fue rechazado. "
        "Acércate a la caja para pagar de nuevo.",
        ruta="/cliente/mesa",
    )

