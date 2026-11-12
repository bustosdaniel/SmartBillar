"""Torneos de eliminación directa: inscripciones, llaves y resultados. El backend calcula el precio y cada
operación guarda sus cobros, avisos y movimientos en la misma transacción."""

from datetime import datetime
from math import floor

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Jugador, Membresia, Mesa, Movimiento, Partido, Plan, SesionMesa, Torneo, Usuario
from app.models.enums import CategoriaTorneo, EstadoTorneo, MetodoPago, ModoJuego, Rol, TipoMovimiento, TipoNotificacion
from app.services import caja, llaves
from app.services.notificaciones import notificar, notificar_administradores, notificar_clientes
from app.services.usuarios import ErrorDeDatos
from app.tiempo import ZONA_CLUB, ahora_utc

NOMBRES_MODO = {ModoJuego.POOL: "Pool", ModoJuego.TRES_BANDAS: "Tres Bandas", ModoJuego.LIBRE: "Libre"}
NOMBRES_CATEGORIA = {
    CategoriaTorneo.ABIERTA: "Abierta",
    CategoriaTorneo.PRINCIPIANTE: "Principiante",
    CategoriaTorneo.AVANZADO: "Avanzado",
}

TORNEO = TipoNotificacion.TORNEO


def _ruta_cliente(torneo: Torneo) -> str:
    return f"/cliente/torneos/{torneo.id}"


def _ruta_admin(torneo: Torneo) -> str:
    return f"/admin/torneos/{torneo.id}"


def _momento(torneo: Torneo) -> datetime:
    """Cuándo empieza, en la hora del club."""
    return datetime.combine(torneo.fecha, torneo.hora, ZONA_CLUB)


def _fecha_texto(torneo: Torneo) -> str:
    return _momento(torneo).strftime("%d/%m/%Y · %H:%M")


def _movimiento(db: Session, torneo: Torneo, detalle: str) -> None:
    db.add(Movimiento(tipo=TipoMovimiento.TORNEO, titulo=torneo.nombre, detalle=detalle[:200]))


def _torneo(db: Session, torneo_id: int) -> Torneo:
    """Bloquea la fila: dos inscripciones a la vez no pueden tomar el mismo último cupo."""
    torneo = db.get(Torneo, torneo_id, with_for_update=True)
    if torneo is None:
        raise ErrorDeDatos("El torneo no existe.")
    return torneo


def _jugador(torneo: Torneo, jugador_id: int) -> Jugador:
    jugador = next((j for j in torneo.jugadores if j.id == jugador_id), None)
    if jugador is None:
        raise ErrorDeDatos("Ese jugador no está inscrito en este torneo.")
    return jugador


def _partido(torneo: Torneo, partido_id: int) -> Partido:
    partido = next((p for p in torneo.partidos if p.id == partido_id), None)
    if partido is None:
        raise ErrorDeDatos("Ese partido no es de este torneo.")
    return partido


def _a_salida(torneo: Torneo, usuario: Usuario) -> dict:
    # A un cliente no se le muestra lo que pagaron los demás (revelaría quién tiene descuento).
    def privado(jugador: Jugador) -> bool:
        return usuario.rol == Rol.CLIENTE and jugador.cliente_id != usuario.id

    return {
        "id": torneo.id,
        "nombre": torneo.nombre,
        "modo": torneo.modo,
        "categoria": torneo.categoria,
        "fecha": torneo.fecha,
        "hora": torneo.hora.strftime("%H:%M"),
        "cupos": torneo.cupos,
        "inscripcion": torneo.inscripcion,
        "premio": torneo.premio,
        "estado": torneo.estado,
        "jugadores": [
            {
                "id": j.id,
                "cliente_id": j.cliente_id,
                "nombre": j.nombre,
                "pagado": True if privado(j) else j.pagado,
                "monto": 0 if privado(j) else j.monto,
            }
            for j in sorted(torneo.jugadores, key=lambda j: j.id)
        ],
        "partidos": [
            {
                "id": p.id,
                "ronda": p.ronda,
                "posicion": p.posicion,
                "a": p.a_id,
                "b": p.b_id,
                "mesa_id": p.mesa_id,
                "ganador": p.ganador_id,
            }
            for p in sorted(torneo.partidos, key=lambda p: (p.ronda, p.posicion))
        ],
    }


def listar(db: Session, usuario: Usuario) -> list[dict]:
    consulta = (
        select(Torneo)
        .options(selectinload(Torneo.jugadores), selectinload(Torneo.partidos))
        .order_by(Torneo.fecha, Torneo.id)
    )
    return [_a_salida(torneo, usuario) for torneo in db.scalars(consulta)]


def crear(db: Session, **datos) -> Torneo:
    torneo = Torneo(**datos, estado=EstadoTorneo.INSCRIPCIONES)
    if _momento(torneo) <= datetime.now(ZONA_CLUB):
        raise ErrorDeDatos("La fecha y la hora del torneo deben ser futuras.")
    # Eliminación directa: con menos mesas que partidos se juega por tandas, pero hace falta al menos una.
    if db.scalar(select(Mesa.id).where(Mesa.modo == torneo.modo, Mesa.retirada_en.is_(None)).limit(1)) is None:
        raise ErrorDeDatos(f"El club no tiene mesas de {NOMBRES_MODO[torneo.modo]}. Agrega una en Mesas primero.")
    db.add(torneo)
    db.flush()
    modo = NOMBRES_MODO[torneo.modo]
    valor = caja.pesos(torneo.inscripcion) if torneo.inscripcion > 0 else "gratis"
    _movimiento(db, torneo, f"Torneo creado · {modo}")
    notificar_clientes(
        db,
        TORNEO,
        f"Nuevo torneo · {torneo.nombre}",
        f"{modo} · {NOMBRES_CATEGORIA[torneo.categoria]} · {_fecha_texto(torneo)}. "
        f"{torneo.cupos} cupos, inscripción {valor}. ¡Inscríbete antes de que se acaben!",
        ruta="/cliente/torneos",
    )
    return torneo


def _precio(db: Session, torneo: Torneo, cliente_id: int) -> int:
    """Inscripción con el descuento de la membresía vigente, redondeada a centenas."""
    membresia = db.get(Membresia, cliente_id)
    descuento = 0
    if membresia is not None and membresia.vence > ahora_utc():
        descuento = min(100, db.get(Plan, membresia.plan_id).descuento_torneo)
    return floor(torneo.inscripcion * (100 - descuento) / 100 / 100 + 0.5) * 100


def _agregar_jugador(db: Session, torneo: Torneo, cliente: Usuario, pagado: bool, monto: int) -> Jugador:
    if torneo.estado != EstadoTorneo.INSCRIPCIONES:
        raise ErrorDeDatos("Las inscripciones están cerradas.")
    if _momento(torneo) <= datetime.now(ZONA_CLUB):
        raise ErrorDeDatos("Las inscripciones cerraron: el torneo ya llegó a su fecha.")
    if len(torneo.jugadores) >= torneo.cupos:
        raise ErrorDeDatos("No quedan cupos.")
    if any(j.cliente_id == cliente.id for j in torneo.jugadores):
        raise ErrorDeDatos("Este cliente ya está inscrito.")
    jugador = Jugador(cliente_id=cliente.id, nombre=cliente.nombre, pagado=pagado, monto=monto)
    torneo.jugadores.append(jugador)
    db.flush()
    _movimiento(db, torneo, f"Inscripción · {cliente.nombre}{'' if pagado else ' (pendiente de pago)'}")
    if pagado:
        asunto = f"Inscripción confirmada · {torneo.nombre}"
        mensaje = f"Quedaste inscrito para el {_fecha_texto(torneo)}. ¡Mucha suerte!"
    else:
        asunto = f"Inscripción pendiente de pago · {torneo.nombre}"
        mensaje = f"Reservamos tu cupo. Paga {caja.pesos(monto)} en caja antes del torneo para confirmarlo."
    notificar(db, cliente.id, TORNEO, asunto, mensaje, ruta=_ruta_cliente(torneo))
    return jugador


def _cobrar(
    db: Session, torneo: Torneo, jugador: Jugador, metodo: MetodoPago | None, recibido: int | None
) -> None:
    if jugador.monto == 0:
        return
    if metodo is None:
        raise ErrorDeDatos("Falta registrar el pago de la inscripción.")
    caja.registrar_pago(
        db,
        concepto=f"Inscripción {torneo.nombre}",
        cliente=jugador.nombre,
        cliente_id=jugador.cliente_id,
        monto=jugador.monto,
        metodo=metodo,
        recibido=recibido,
        jugador_id=jugador.id,
    )


def inscribir(db: Session, torneo_id: int, cliente_id: int, metodo: MetodoPago | None, recibido: int | None) -> None:
    """El personal inscribe y cobra a la vez: si el cobro falla, no queda inscrito."""
    torneo = _torneo(db, torneo_id)
    cliente = db.get(Usuario, cliente_id)
    if cliente is None or cliente.rol != Rol.CLIENTE or cliente.eliminado_en is not None:
        raise ErrorDeDatos("Ese cliente no existe.")
    jugador = _agregar_jugador(db, torneo, cliente, True, _precio(db, torneo, cliente.id))
    _cobrar(db, torneo, jugador, metodo, recibido)


def inscribirme(db: Session, torneo_id: int, cliente: Usuario) -> None:
    """El cliente reserva su cupo desde la app y paga en caja; si le sale gratis, queda confirmado."""
    torneo = _torneo(db, torneo_id)
    monto = _precio(db, torneo, cliente.id)
    pagado = monto == 0
    _agregar_jugador(db, torneo, cliente, pagado, monto)
    deuda = "" if pagado else f" y debe pagar {caja.pesos(monto)} en caja"
    notificar_administradores(
        db,
        TORNEO,
        f"Nueva inscripción · {torneo.nombre}",
        f"{cliente.nombre} se inscribió{deuda}. Quedan {torneo.cupos - len(torneo.jugadores)} cupos.",
        ruta=_ruta_admin(torneo),
    )


def cobrar_pendiente(
    db: Session, torneo_id: int, jugador_id: int, metodo: MetodoPago | None, recibido: int | None
) -> None:
    torneo = _torneo(db, torneo_id)
    jugador = _jugador(torneo, jugador_id)
    if jugador.pagado:
        raise ErrorDeDatos("Esa inscripción ya está pagada.")
    _cobrar(db, torneo, jugador, metodo, recibido)
    jugador.pagado = True
    notificar(
        db,
        jugador.cliente_id,
        TORNEO,
        f"Pago recibido · {torneo.nombre}",
        f"Tu inscripción quedó confirmada. Nos vemos el {_fecha_texto(torneo)}.",
        ruta=_ruta_cliente(torneo),
    )


def _sacar(db: Session, torneo: Torneo, jugador: Jugador, retiro: bool) -> None:
    """Solo antes de iniciar: con las llaves armadas ya no se puede sacar a nadie."""
    if torneo.estado != EstadoTorneo.INSCRIPCIONES:
        raise ErrorDeDatos("Con el torneo iniciado ya no se puede quitar a nadie.")
    torneo.jugadores.remove(jugador)
    _movimiento(db, torneo, f"{'Se retiró' if retiro else 'Inscripción anulada'} · {jugador.nombre}")
    notificar(
        db,
        jugador.cliente_id,
        TORNEO,
        f"{'Te retiraste de' if retiro else 'Inscripción anulada en'} {torneo.nombre}",
        "Liberamos tu cupo. Puedes volver a inscribirte mientras haya cupos."
        if retiro
        else "El club anuló tu inscripción. Si tienes dudas, acércate a la caja.",
        ruta=_ruta_cliente(torneo),
    )


def quitar(db: Session, torneo_id: int, jugador_id: int, devolver: bool) -> None:
    """Quita al jugador y, si se pide, devuelve su inscripción desde la caja en la misma transacción."""
    torneo = _torneo(db, torneo_id)
    jugador = _jugador(torneo, jugador_id)
    _sacar(db, torneo, jugador, retiro=False)
    if devolver and jugador.pagado and jugador.monto > 0:
        caja.registrar_egreso(db, f"Devolución inscripción {torneo.nombre} · {jugador.nombre}"[:120], jugador.monto)


def retirarme(db: Session, torneo_id: int, cliente: Usuario) -> None:
    """El cliente solo se retira si no hay dinero que devolver; si pagó, la devolución se hace en caja."""
    torneo = _torneo(db, torneo_id)
    jugador = next((j for j in torneo.jugadores if j.cliente_id == cliente.id), None)
    if jugador is None:
        raise ErrorDeDatos("No estás inscrito en este torneo.")
    if jugador.pagado and jugador.monto > 0:
        raise ErrorDeDatos("Ya pagaste tu inscripción: acércate a caja para retirarte y recibir la devolución.")
    _sacar(db, torneo, jugador, retiro=True)
    notificar_administradores(
        db,
        TORNEO,
        f"Retiro · {torneo.nombre}",
        f"{jugador.nombre} se retiró del torneo. Ahora quedan {torneo.cupos - len(torneo.jugadores)} cupos.",
        ruta=_ruta_admin(torneo),
    )


def iniciar(db: Session, torneo_id: int) -> None:
    torneo = _torneo(db, torneo_id)
    if torneo.estado != EstadoTorneo.INSCRIPCIONES:
        raise ErrorDeDatos("Este torneo ya fue iniciado.")
    if len(torneo.jugadores) < 2:
        raise ErrorDeDatos("Se necesitan al menos 2 jugadores para iniciar.")
    if any(not j.pagado for j in torneo.jugadores):
        raise ErrorDeDatos("Hay inscripciones pendientes de pago. Cóbralas antes de iniciar.")
    jugadores = sorted(torneo.jugadores, key=lambda j: j.id)
    cuadro = llaves.generar_llaves([j.id for j in jugadores])
    for lugar in cuadro:
        torneo.partidos.append(
            Partido(ronda=lugar.ronda, posicion=lugar.posicion, a_id=lugar.a, b_id=lugar.b, ganador_id=lugar.ganador)
        )
    torneo.estado = EstadoTorneo.EN_CURSO
    nombres = {j.id: j.nombre for j in jugadores}
    for jugador in jugadores:
        partido = next((p for p in cuadro if p.ganador is None and jugador.id in (p.a, p.b)), None)
        rival = nombres.get(partido.b if partido.a == jugador.id else partido.a) if partido else None
        notificar(
            db,
            jugador.cliente_id,
            TORNEO,
            f"Las llaves de {torneo.nombre} están listas",
            f"Tu primer partido es contra {rival}." if rival else "Tienes pase directo a la siguiente ronda.",
            ruta=_ruta_cliente(torneo),
        )
    _movimiento(db, torneo, f"Torneo iniciado · {len(jugadores)} jugadores")


def asignar_mesa(db: Session, torneo_id: int, partido_id: int, mesa_id: int | None) -> None:
    torneo = _torneo(db, torneo_id)
    if torneo.estado != EstadoTorneo.EN_CURSO:
        raise ErrorDeDatos("Este torneo no está en curso.")
    partido = _partido(torneo, partido_id)
    if partido.ganador_id is not None:
        raise ErrorDeDatos("Ese partido ya se jugó.")
    if mesa_id is not None:
        mesa = db.get(Mesa, mesa_id)
        if mesa is None or mesa.retirada_en is not None or mesa.modo != torneo.modo:
            raise ErrorDeDatos("Esa mesa no sirve para este torneo.")
        en_sesion = db.scalar(select(SesionMesa.id).where(SesionMesa.mesa_id == mesa_id, SesionMesa.fin.is_(None)))
        en_partido = db.scalar(
            select(Partido.id)
            .join(Torneo, Partido.torneo_id == Torneo.id)
            .where(
                Partido.mesa_id == mesa_id,
                Partido.ganador_id.is_(None),
                Partido.id != partido.id,
                Torneo.estado == EstadoTorneo.EN_CURSO,
            )
        )
        if en_sesion is not None or en_partido is not None:
            raise ErrorDeDatos(f"La {mesa.nombre} está ocupada. Elige otra.")
    partido.mesa_id = mesa_id


def _nombre_ronda(ronda: int, rondas: int) -> str:
    nombres = {1: "la Final", 2: "la Semifinal", 3: "Cuartos de final", 4: "Octavos de final"}
    return nombres.get(rondas - ronda, f"la Ronda {ronda + 1}")


def registrar_ganador(db: Session, torneo_id: int, partido_id: int, jugador_id: int) -> None:
    torneo = _torneo(db, torneo_id)
    if torneo.estado != EstadoTorneo.EN_CURSO:
        raise ErrorDeDatos("Este torneo no está en curso.")
    partido = _partido(torneo, partido_id)
    filas = {(p.ronda, p.posicion): p for p in torneo.partidos}
    cuadro = [
        llaves.PartidoLlave(ronda=p.ronda, posicion=p.posicion, a=p.a_id, b=p.b_id, ganador=p.ganador_id)
        for p in filas.values()
    ]
    nuevo = llaves.definir_ganador(cuadro, partido.ronda, partido.posicion, jugador_id)
    # Sin cambios: el partido siguiente ya se jugó o ese jugador no está en este partido.
    if nuevo is cuadro:
        raise ErrorDeDatos("No se puede registrar ese resultado.")
    perdedor_id = partido.b_id if partido.a_id == jugador_id else partido.a_id
    for lugar in nuevo:
        fila = filas[(lugar.ronda, lugar.posicion)]
        fila.a_id, fila.b_id, fila.ganador_id = lugar.a, lugar.b, lugar.ganador
    nombres = {j.id: j for j in torneo.jugadores}
    ganador = nombres[jugador_id]
    es_campeon = llaves.campeon(nuevo) is not None
    if es_campeon:
        torneo.estado = EstadoTorneo.FINALIZADO
        _movimiento(db, torneo, f"Campeón · {ganador.nombre}")
    notificar(
        db,
        ganador.cliente_id,
        TORNEO,
        f"¡Eres campeón de {torneo.nombre}!" if es_campeon else f"Ganaste tu partido en {torneo.nombre}",
        f"Felicitaciones. Reclama tu premio en caja: {torneo.premio}."
        if es_campeon
        else f"Avanzas a {_nombre_ronda(partido.ronda + 1, llaves.total_rondas(nuevo))}.",
        ruta=_ruta_cliente(torneo),
    )
    perdedor = nombres.get(perdedor_id)
    if perdedor is not None:
        notificar(
            db,
            perdedor.cliente_id,
            TORNEO,
            f"Resultado en {torneo.nombre}",
            "Esta vez no se dio. ¡Gracias por jugar, te esperamos en el próximo torneo!",
            ruta=_ruta_cliente(torneo),
        )
