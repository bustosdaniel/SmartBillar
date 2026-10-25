"""Membresías: el cliente solicita un plan desde la app y lo paga en caja; el personal (administrador o
cajero) la activa al cobrar, o rechaza la solicitud. Misma lógica que frontend/src/membresias."""

from datetime import UTC, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Membresia, Movimiento, Plan, SolicitudMembresia, Usuario
from app.models.enums import Rol, TipoMovimiento, TipoNotificacion
from app.services.notificaciones import notificar, notificar_administradores
from app.services.usuarios import ErrorDeDatos
from app.tiempo import ZONA_CLUB, ahora_utc

DURACION = timedelta(days=30)


def _fecha_club(fecha) -> str:
    return fecha.replace(tzinfo=UTC).astimezone(ZONA_CLUB).strftime("%d/%m/%Y")


def _plan(db: Session, plan_id: str) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise ErrorDeDatos("Ese plan no existe.")
    return plan


def _cliente(db: Session, cliente_id: int) -> Usuario:
    cliente = db.get(Usuario, cliente_id)
    if cliente is None or cliente.rol != Rol.CLIENTE:
        raise ErrorDeDatos("Ese cliente no existe.")
    return cliente


def listar_planes(db: Session) -> list[Plan]:
    # Orden fijo de menor a mayor beneficio, como en el frontend.
    return sorted(db.scalars(select(Plan)), key=lambda p: p.precio_mensual)


def actualizar_plan(db: Session, plan_id: str, **datos) -> Plan:
    plan = _plan(db, plan_id)
    for campo, valor in datos.items():
        setattr(plan, campo, valor)
    return plan


def listar_membresias(db: Session) -> list[Membresia]:
    return list(db.scalars(select(Membresia).order_by(Membresia.vence)))


def listar_solicitudes(db: Session) -> list[SolicitudMembresia]:
    return list(db.scalars(select(SolicitudMembresia).order_by(SolicitudMembresia.fecha)))


def solicitar(db: Session, cliente: Usuario, plan_id: str) -> SolicitudMembresia:
    """Una solicitud abierta por cliente: si ya tenía una, se reemplaza por el plan nuevo."""
    plan = _plan(db, plan_id)
    solicitud = db.get(SolicitudMembresia, cliente.id)
    if solicitud is None:
        solicitud = SolicitudMembresia(cliente_id=cliente.id, plan_id=plan.id)
        db.add(solicitud)
    else:
        solicitud.plan_id = plan.id
        solicitud.fecha = ahora_utc()
    db.add(Movimiento(tipo=TipoMovimiento.CAJA, titulo="Solicitud de membresía", detalle=f"{cliente.nombre} · {plan.nombre}"))
    notificar_administradores(
        db,
        TipoNotificacion.MEMBRESIA,
        "Nueva solicitud de membresía",
        f"{cliente.nombre} solicitó el plan {plan.nombre}. Revisa la solicitud en Membresías y actívala al recibir el pago en caja.",
        ruta="/admin/membresias",
    )
    db.flush()
    return solicitud


def cancelar_solicitud(db: Session, cliente: Usuario) -> None:
    """El cliente se arrepiente de su solicitud."""
    solicitud = db.get(SolicitudMembresia, cliente.id)
    if solicitud is None:
        raise ErrorDeDatos("No tienes una solicitud pendiente.")
    plan = solicitud.plan_id
    db.delete(solicitud)
    notificar_administradores(
        db,
        TipoNotificacion.MEMBRESIA,
        "Solicitud de membresía cancelada",
        f"{cliente.nombre} canceló su solicitud del plan {_plan(db, plan).nombre}.",
        ruta="/admin/membresias",
    )


def rechazar_solicitud(db: Session, cliente_id: int) -> None:
    """El personal no aprueba la solicitud; se le avisa al cliente."""
    solicitud = db.get(SolicitudMembresia, cliente_id)
    if solicitud is None:
        raise ErrorDeDatos("Esa solicitud ya no existe.")
    plan = _plan(db, solicitud.plan_id)
    db.delete(solicitud)
    notificar(
        db,
        cliente_id,
        TipoNotificacion.MEMBRESIA,
        f"Solicitud del plan {plan.nombre} rechazada",
        "El club no aprobó tu solicitud. Si tienes dudas, acércate a la caja o elige otro plan.",
        ruta="/cliente/membresia",
    )


def asignar(db: Session, cliente_id: int, plan_id: str) -> Membresia:
    """Activa o renueva por 30 días. Si renueva el mismo plan antes de vencer, se suman al vencimiento
    actual. Atiende (borra) la solicitud del cliente si tenía una."""
    cliente = _cliente(db, cliente_id)
    plan = _plan(db, plan_id)
    ahora = ahora_utc()
    membresia = db.get(Membresia, cliente.id)
    if membresia is not None and membresia.plan_id == plan.id and membresia.vence > ahora:
        membresia.vence = membresia.vence + DURACION
    elif membresia is not None:
        membresia.plan_id, membresia.inicio, membresia.vence = plan.id, ahora, ahora + DURACION
    else:
        membresia = Membresia(cliente_id=cliente.id, plan_id=plan.id, inicio=ahora, vence=ahora + DURACION)
        db.add(membresia)
    solicitud = db.get(SolicitudMembresia, cliente.id)
    if solicitud is not None:
        db.delete(solicitud)
    horas = f" y {plan.horas_gratis_mes} h gratis al mes" if plan.horas_gratis_mes > 0 else ""
    notificar(
        db,
        cliente.id,
        TipoNotificacion.MEMBRESIA,
        f"Tu membresía {plan.nombre} está activa",
        f"Disfruta tus beneficios hasta el {_fecha_club(membresia.vence)}: {plan.descuento_mesa}% en mesa{horas}.",
        ruta="/cliente/membresia",
    )
    db.add(Movimiento(tipo=TipoMovimiento.PAGO, titulo=f"Membresía {plan.nombre}", detalle=f"{cliente.nombre} · 30 días"))
    db.flush()
    db.refresh(membresia)
    return membresia
