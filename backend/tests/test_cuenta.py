"""La cuenta de una mesa: es lo que se cobra, así que estos casos son los mismos que prueba el frontend
(src/mesas/cuenta.test.ts) para que la vista previa y el recibo den igual."""

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.services import mesas

MIN = 60_000
HORA = 60 * MIN
INICIO = datetime(2026, 11, 12, 15, 0)


@pytest.mark.parametrize(
    ("tiempo_ms", "tarifa", "esperado"),
    [
        (0, 12000, 0),
        (1, 12000, 200),  # un milisegundo ya es un minuto
        (60 * MIN, 12000, 12000),
        (60 * MIN + 1, 12000, 12200),  # cada minuto empezado
        (90 * MIN, 12000, 18000),
        (MIN, 15000, 300),  # 250 → se redondea la mitad hacia arriba, como Math.round
    ],
)
def test_costo_por_minuto_iniciado(tiempo_ms, tarifa, esperado):
    assert mesas.costo(tiempo_ms, tarifa) == esperado


def test_centena_redondea_como_el_frontend():
    # Python redondea 2.5 a 2 (al par); el cobro debe dar lo mismo que Math.round del navegador.
    assert mesas._centena(250) == 300
    assert mesas._centena(249) == 200
    assert mesas._centena(350) == 400


def _sesion(**datos):
    base = dict(inicio=INICIO, pausado_ms=0, pausada_desde=None, detenida_en=None, tarifa_hora=12000, cliente_id=7, consumos=[])
    return SimpleNamespace(**(base | datos))


def test_tiempo_jugado_descuenta_pausas_y_se_congela_al_finalizar():
    ahora = INICIO + timedelta(minutes=50)
    assert mesas.tiempo_jugado(_sesion(), ahora) == 50 * MIN
    assert mesas.tiempo_jugado(_sesion(pausado_ms=10 * MIN), ahora) == 40 * MIN
    en_pausa = _sesion(pausada_desde=INICIO + timedelta(minutes=20))
    assert mesas.tiempo_jugado(en_pausa, ahora) == 20 * MIN
    detenida = _sesion(detenida_en=INICIO + timedelta(minutes=45))
    assert mesas.tiempo_jugado(detenida, INICIO + timedelta(hours=3)) == 45 * MIN


@pytest.fixture
def con_plan(monkeypatch):
    """Simula la membresía del cliente y las horas gratis que ya usó, sin base de datos."""

    def preparar(plan=None, gratis_usado_ms=0):
        monkeypatch.setattr(mesas, "_plan_vigente", lambda _db, _cliente, _fecha: plan)
        monkeypatch.setattr(mesas, "_gratis_usado_en_mes", lambda _db, _cliente, _fecha: gratis_usado_ms)

    return preparar


def _plan(**datos):
    return SimpleNamespace(**({"id": "premium", "descuento_mesa": 0, "horas_gratis_mes": 0, "descuento_bar": 0} | datos))


def _consumo(precio, cantidad):
    return SimpleNamespace(precio=precio, cantidad=cantidad)


def _cuenta(minutos, consumos=()):
    sesion = _sesion(detenida_en=INICIO + timedelta(minutes=minutos), consumos=list(consumos))
    return mesas.calcular_cuenta(None, sesion, sesion.detenida_en)


def test_sin_membresia_mesa_mas_consumos(con_plan):
    con_plan(None)
    cuenta = _cuenta(90, [_consumo(5000, 1)])
    assert (cuenta.subtotal_mesa, cuenta.descuento, cuenta.total) == (18000, 0, 23000)


def test_descuento_del_plan_sobre_la_mesa(con_plan):
    con_plan(_plan(id="gold", descuento_mesa=25))
    cuenta = _cuenta(60)
    assert (cuenta.descuento, cuenta.total) == (3000, 9000)


def test_horas_gratis_cubren_la_partida_y_descuento_en_bar(con_plan):
    # El caso que se cobró de verdad: 90 min con Premium y 2 cervezas.
    con_plan(_plan(descuento_mesa=15, horas_gratis_mes=2, descuento_bar=5))
    cuenta = _cuenta(90, [_consumo(6000, 2)])
    assert cuenta.gratis_ms == 90 * MIN
    assert cuenta.valor_gratis == 18000
    assert cuenta.descuento_bar == 600
    assert cuenta.total == 11400


def test_primero_horas_gratis_luego_porcentaje(con_plan):
    con_plan(_plan(descuento_mesa=15, horas_gratis_mes=2))
    cuenta = _cuenta(180)
    assert (cuenta.subtotal_mesa, cuenta.valor_gratis, cuenta.descuento, cuenta.total) == (36000, 24000, 1800, 10200)


def test_horas_gratis_ya_gastadas_en_el_mes(con_plan):
    con_plan(_plan(horas_gratis_mes=2), gratis_usado_ms=2 * HORA)
    cuenta = _cuenta(60)
    assert (cuenta.gratis_ms, cuenta.total) == (0, 12000)
