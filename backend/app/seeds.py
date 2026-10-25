"""Datos iniciales. Uso:

    python -m app.seeds          # datos base: mesas, tarifas, planes, productos y empleados
    python -m app.seeds --demo   # además clientes, membresías, torneos e historial de cajas de prueba

Solo crea lo que falta: se puede correr varias veces sin duplicar nada ni pisar cambios del admin.
Los datos son los mismos que tenía el frontend en localStorage (mismos ids de usuarios y mesas)."""

import argparse
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SesionLocal
from app.models import (
    Caja,
    Egreso,
    Jugador,
    Membresia,
    Mesa,
    Pago,
    Partido,
    Plan,
    Producto,
    ReglaHorario,
    TarifaModo,
    Torneo,
    Usuario,
)
from app.models.enums import (
    Cargo,
    CategoriaProducto,
    CategoriaTorneo,
    EstadoTorneo,
    MetodoPago,
    ModoJuego,
    Rol,
)
from app.seguridad import encriptar_password
from app.services.llaves import definir_ganador, generar_llaves
from app.tiempo import ZONA_CLUB, a_utc, ahora_utc

# Contraseña de todas las cuentas de prueba (igual que en el frontend).
PASSWORD_DEMO = "123456"

MESAS = [
    (1, "Mesa 1", ModoJuego.POOL),
    (2, "Mesa 2", ModoJuego.POOL),
    (3, "Mesa 3", ModoJuego.POOL),
    (4, "Mesa 4", ModoJuego.POOL),
    (5, "Mesa 5", ModoJuego.TRES_BANDAS),
    (6, "Mesa 6", ModoJuego.TRES_BANDAS),
    (7, "Mesa 7", ModoJuego.LIBRE),
    (8, "Mesa 8", ModoJuego.LIBRE),
]

TARIFAS = {ModoJuego.POOL: 12000, ModoJuego.TRES_BANDAS: 15000, ModoJuego.LIBRE: 10000}

REGLAS = [
    ("Hora feliz", [1, 2, 3, 4], time(14), time(17), -10),
    ("Noche de fin de semana", [5, 6], time(20), time(2), 15),
]

PLANES = [
    dict(
        id="basica",
        nombre="Básica",
        precio_mensual=30000,
        descuento_mesa=5,
        horas_gratis_mes=0,
        descuento_bar=0,
        descuento_torneo=0,
        extras=["1 punto por hora jugada", "Bono de cumpleaños: 1 hora gratis"],
    ),
    dict(
        id="premium",
        nombre="Premium",
        precio_mensual=60000,
        descuento_mesa=15,
        horas_gratis_mes=2,
        descuento_bar=5,
        descuento_torneo=50,
        extras=[
            "Préstamo de taco profesional",
            "1 invitado gratis al mes",
            "2 puntos por hora jugada",
            "Bono de cumpleaños: 1 hora gratis",
        ],
    ),
    dict(
        id="gold",
        nombre="Gold",
        precio_mensual=100000,
        descuento_mesa=25,
        horas_gratis_mes=5,
        descuento_bar=10,
        descuento_torneo=100,
        extras=[
            "Elegir mesa preferida o VIP",
            "Préstamo de taco profesional",
            "2 invitados gratis al mes",
            "1 clase de entrenamiento al mes",
            "3 puntos por hora jugada",
            "Bono de cumpleaños: 1 hora gratis",
        ],
    ),
]

PRODUCTOS = [
    ("gaseosa", "Gaseosa", CategoriaProducto.BEBIDA, 4000),
    ("cerveza", "Cerveza", CategoriaProducto.BEBIDA, 6000),
    ("agua", "Agua", CategoriaProducto.BEBIDA, 3000),
    ("jugo", "Jugo", CategoriaProducto.BEBIDA, 5000),
    ("papas-margarita", "Papas Margarita", CategoriaProducto.PAQUETE, 3500),
    ("super-ricas", "Super Ricas", CategoriaProducto.PAQUETE, 3500),
    ("de-todito", "De Todito", CategoriaProducto.PAQUETE, 5000),
    ("todo-rico", "Todo Rico", CategoriaProducto.PAQUETE, 4500),
]

# Equipo del proyecto como empleados del club, más el admin de prueba.
EMPLEADOS = [
    (2, "Admin Demo", "admin@billar.com", Cargo.ADMINISTRADOR),
    (5, "Jader Erit Nuñez Bacheloth", "jader@billar.com", Cargo.ADMINISTRADOR),
    (6, "Daniel Esteban Ramírez Cristancho", "daniel@billar.com", Cargo.ADMINISTRADOR),
    (7, "Neifer Daniel Bustos Carrillo", "neifer@billar.com", Cargo.CAJERO),
]

# Los tres primeros son los de prueba del frontend; el resto eran "invitados" de los torneos de
# ejemplo y ahora son clientes con cuenta (ya no hay clientes sin cuenta).
CLIENTES_DEMO = [
    (1, "Cliente Demo", "cliente@billar.com", "3001234567"),
    (3, "Juan Pérez", "juan@billar.com", "3109876543"),
    (4, "Laura Gómez", "laura@billar.com", "3205551234"),
    (8, "Carlos Ruiz", "carlos@billar.com", "3001110001"),
    (9, "Andrés Mora", "andres@billar.com", "3001110002"),
    (10, "Pedro Díaz", "pedro@billar.com", "3001110003"),
    (11, "Sofía Castro", "sofia@billar.com", "3001110004"),
    (12, "Mateo Rojas", "mateo@billar.com", "3001110005"),
    (13, "Valentina León", "valentina@billar.com", "3001110006"),
]


def _crear_si_falta(db: Session, modelo, clave, **datos) -> bool:
    if db.get(modelo, clave) is not None:
        return False
    db.add(modelo(**datos))
    return True


def sembrar_base(db: Session) -> dict[str, int]:
    nuevos = dict.fromkeys(("mesas", "tarifas", "reglas", "planes", "productos", "empleados"), 0)
    for id_, nombre, modo in MESAS:
        nuevos["mesas"] += _crear_si_falta(db, Mesa, id_, id=id_, nombre=nombre, modo=modo)
    for modo, hora in TARIFAS.items():
        nuevos["tarifas"] += _crear_si_falta(db, TarifaModo, modo, modo=modo, hora=hora)
    for nombre, dias, desde, hasta, ajuste in REGLAS:
        if db.scalar(select(ReglaHorario).where(ReglaHorario.nombre == nombre)) is None:
            db.add(ReglaHorario(nombre=nombre, dias=dias, desde=desde, hasta=hasta, ajuste=ajuste))
            nuevos["reglas"] += 1
    for plan in PLANES:
        nuevos["planes"] += _crear_si_falta(db, Plan, plan["id"], **plan)
    for id_, nombre, categoria, precio in PRODUCTOS:
        nuevos["productos"] += _crear_si_falta(db, Producto, id_, id=id_, nombre=nombre, categoria=categoria, precio=precio)
    for id_, nombre, email, cargo in EMPLEADOS:
        nuevos["empleados"] += _crear_si_falta(
            db,
            Usuario,
            id_,
            id=id_,
            nombre=nombre,
            email=email,
            rol=Rol.ADMIN,
            cargo=cargo,
            password_hash=encriptar_password(PASSWORD_DEMO),
        )
    return nuevos


def _hoy_club() -> date:
    return datetime.now(ZONA_CLUB).date()


def _hora_club(dia: date, hora: int, minutos: int = 0) -> datetime:
    """Una hora del club (Colombia) convertida a UTC para guardarla."""
    return a_utc(datetime.combine(dia, time(hora, minutos), tzinfo=ZONA_CLUB))


def _sembrar_torneos(db: Session) -> int:
    hoy = _hoy_club()
    clientes = {u.nombre: u for u in db.scalars(select(Usuario).where(Usuario.rol == Rol.CLIENTE))}

    def jugador(torneo: Torneo, nombre: str, pagado: bool = True, monto: int = 20000) -> Jugador:
        nuevo = Jugador(cliente_id=clientes[nombre].id, nombre=nombre, pagado=pagado, monto=monto)
        torneo.jugadores.append(nuevo)
        return nuevo

    en_curso = Torneo(
        nombre="Torneo 8 Ball",
        modo=ModoJuego.POOL,
        categoria=CategoriaTorneo.ABIERTA,
        fecha=hoy,
        hora=time(19),
        cupos=8,
        inscripcion=20000,
        premio="$300.000 + trofeo",
        estado=EstadoTorneo.EN_CURSO,
    )
    inscritos = [
        jugador(en_curso, "Juan Pérez"),
        jugador(en_curso, "Laura Gómez", monto=0),
        *(
            jugador(en_curso, nombre)
            for nombre in ("Carlos Ruiz", "Andrés Mora", "Pedro Díaz", "Sofía Castro", "Mateo Rojas", "Valentina León")
        ),
    ]
    copa = Torneo(
        nombre="Copa Tres Bandas",
        modo=ModoJuego.TRES_BANDAS,
        categoria=CategoriaTorneo.AVANZADO,
        fecha=hoy + timedelta(days=21),
        hora=time(18),
        cupos=16,
        inscripcion=30000,
        premio="$500.000 + trofeo",
        estado=EstadoTorneo.INSCRIPCIONES,
    )
    jugador(copa, "Juan Pérez", monto=15000)
    jugador(copa, "Andrés Mora", monto=30000)
    jugador(copa, "Sofía Castro", pagado=False, monto=30000)
    libre = Torneo(
        nombre="Torneo Libre",
        modo=ModoJuego.LIBRE,
        categoria=CategoriaTorneo.PRINCIPIANTE,
        fecha=hoy + timedelta(days=35),
        hora=time(17),
        cupos=8,
        inscripcion=15000,
        premio="Trofeo + 5 h de mesa",
        estado=EstadoTorneo.INSCRIPCIONES,
    )
    db.add_all([en_curso, copa, libre])
    db.flush()  # para tener los ids de los jugadores

    # Llaves del torneo en curso: ya ganaron Juan y Laura, y hay mesas asignadas a dos partidos.
    llaves = generar_llaves([j.id for j in inscritos])
    llaves = definir_ganador(llaves, 0, 0, inscritos[0].id)
    llaves = definir_ganador(llaves, 0, 1, inscritos[1].id)
    mesas = {(0, 2): 1, (0, 3): 2}
    for p in llaves:
        en_curso.partidos.append(
            Partido(
                ronda=p.ronda,
                posicion=p.posicion,
                a_id=p.a,
                b_id=p.b,
                ganador_id=p.ganador,
                mesa_id=mesas.get((p.ronda, p.posicion)),
            )
        )
    return 3


def _sembrar_cajas(db: Session, dias: int = 75) -> int:
    """Turnos cerrados de los últimos días para que Reportes tenga datos (como historialDemo.ts)."""
    semilla = 7

    def azar() -> float:
        nonlocal semilla
        semilla = (semilla * 16807) % 2147483647
        return semilla / 2147483647

    def entre(minimo: int, maximo: int) -> int:
        return int((minimo + azar() * (maximo - minimo)) / 100 + 0.5) * 100

    metodos = [MetodoPago.EFECTIVO, MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA, MetodoPago.TARJETA]
    clientes = ["Juan Pérez", "Laura Gómez", "Carlos", "Andrés", "Pedro", "Sofía", "Mateo"]
    gastos = ["Compra de tizas", "Insumos en licorería", "Pago de servicios", "Mantenimiento de mesas"]
    hoy = _hoy_club()

    for i in range(dias):
        dia = hoy - timedelta(days=dias - i)
        apertura = _hora_club(dia, 14)
        caja = Caja(apertura=apertura, base=100000, cierre=apertura + timedelta(hours=9))
        db.add(caja)
        db.flush()
        fin_de_semana = dia.isoweekday() in (5, 6, 7)
        for j in range(round((12 if fin_de_semana else 6) + azar() * 6)):
            es_membresia = azar() < 0.1
            metodo = metodos[int(azar() * len(metodos))]
            monto = [30000, 60000, 100000][int(azar() * 3)] if es_membresia else entre(6000, 36000)
            efectivo = metodo == MetodoPago.EFECTIVO
            db.add(
                Pago(
                    caja_id=caja.id,
                    fecha=apertura + timedelta(minutes=25 * j),
                    concepto="Membresía" if es_membresia else f"Mesa {1 + int(azar() * 8)}",
                    cliente_nombre=clientes[int(azar() * len(clientes))],
                    monto=monto,
                    metodo=metodo,
                    recibido=monto if efectivo else None,
                    cambio=0 if efectivo else None,
                )
            )
        for j in range(int(azar() * 3)):
            db.add(
                Egreso(
                    caja_id=caja.id,
                    fecha=apertura + timedelta(minutes=90 * (j + 1)),
                    concepto=gastos[int(azar() * len(gastos))],
                    monto=entre(15000, 90000),
                )
            )
    return dias


def sembrar_demo(db: Session) -> dict[str, int]:
    nuevos = dict.fromkeys(("clientes", "membresías", "torneos", "cajas"), 0)
    for id_, nombre, email, telefono in CLIENTES_DEMO:
        nuevos["clientes"] += _crear_si_falta(
            db,
            Usuario,
            id_,
            id=id_,
            nombre=nombre,
            email=email,
            telefono=telefono,
            rol=Rol.CLIENTE,
            password_hash=encriptar_password(PASSWORD_DEMO),
        )
    db.flush()

    ahora = ahora_utc()
    for cliente_id, plan_id, hace, faltan in ((3, "premium", 10, 20), (4, "gold", 25, 5)):
        nuevos["membresías"] += _crear_si_falta(
            db,
            Membresia,
            cliente_id,
            cliente_id=cliente_id,
            plan_id=plan_id,
            inicio=ahora - timedelta(days=hace),
            vence=ahora + timedelta(days=faltan),
        )

    # Torneos e historial solo en una base sin torneos ni cajas, para no mezclarlos con datos reales.
    if not db.scalar(select(func.count()).select_from(Torneo)):
        nuevos["torneos"] = _sembrar_torneos(db)
    if not db.scalar(select(func.count()).select_from(Caja)):
        nuevos["cajas"] = _sembrar_cajas(db)
    return nuevos


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga los datos iniciales de SmartBillar.")
    parser.add_argument("--demo", action="store_true", help="agrega clientes, torneos e historial de prueba")
    args = parser.parse_args()

    with SesionLocal.begin() as db:
        resumen = sembrar_base(db)
        if args.demo:
            db.flush()
            resumen |= sembrar_demo(db)
    print("Creados:", ", ".join(f"{cantidad} {nombre}" for nombre, cantidad in resumen.items()))
    if args.demo:
        print(f"Cuentas de prueba: cualquier correo de la demo con la contraseña {PASSWORD_DEMO}")


if __name__ == "__main__":
    main()
