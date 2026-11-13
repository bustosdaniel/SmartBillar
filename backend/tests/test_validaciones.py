"""Lo que la API rechaza antes de tocar la base: montos absurdos, tarifas inválidas o que se cruzan."""

import pytest
from pydantic import ValidationError

from app.errores import _mensaje
from app.schemas.caja import AbrirEntrada, DatosPago, EgresoEntrada
from app.schemas.membresias import PlanEntrada
from app.schemas.mesas import TarifasEntrada

POR_MODO = {"pool": {"hora": 12000}, "tres-bandas": {"hora": 15000}, "libre": {"hora": 10000}}


def _regla(nombre, dias, desde, hasta, ajuste=-10):
    return {"nombre": nombre, "dias": dias, "desde": desde, "hasta": hasta, "ajuste": ajuste}


HORA_FELIZ = _regla("Hora feliz", [1, 2, 3, 4], "14:00", "17:00")
NOCHE_FINDE = _regla("Noche finde", [5, 6], "20:00", "02:00", 15)


def _mensaje_de(error: ValidationError) -> str:
    detalle = error.errors()[0]
    return _mensaje({**detalle, "loc": ("body", *detalle["loc"])})


def _tarifas(reglas, por_modo=POR_MODO):
    return TarifasEntrada.model_validate({"porModo": por_modo, "reglas": reglas})


def test_las_tarifas_actuales_son_validas():
    _tarifas([HORA_FELIZ, NOCHE_FINDE])


def test_franjas_pegadas_no_se_cruzan():
    _tarifas([_regla("A", [1], "10:00", "12:00"), _regla("B", [1], "12:00", "14:00")])


@pytest.mark.parametrize(
    ("reglas", "mensaje"),
    [
        (
            [HORA_FELIZ, _regla("Tarde", [4], "16:00", "18:00")],
            "Las tarifas «Hora feliz» y «Tarde» se cruzan el jueves a las 16:00. Ajusta sus días u horas.",
        ),
        (
            [NOCHE_FINDE, _regla("Domingo temprano", [0], "01:00", "05:00")],
            "Las tarifas «Noche finde» y «Domingo temprano» se cruzan el domingo a las 01:00. Ajusta sus días u horas.",
        ),
        (
            [_regla("Todo el día", [1], "10:00", "10:00")],
            "La hora de inicio y la de fin de una tarifa no pueden ser iguales.",
        ),
    ],
)
def test_tarifas_que_se_rechazan(reglas, mensaje):
    with pytest.raises(ValidationError) as error:
        _tarifas(reglas)
    assert _mensaje_de(error.value) == mensaje


def test_tarifa_por_hora_exorbitante():
    with pytest.raises(ValidationError) as error:
        _tarifas([], {**POR_MODO, "pool": {"hora": 213123}})
    assert _mensaje_de(error.value) == "La tarifa por hora no puede ser mayor que $50.000."


def test_ajuste_fuera_de_rango():
    with pytest.raises(ValidationError):
        _tarifas([_regla("Recargo", [1], "10:00", "12:00", 150)])


@pytest.mark.parametrize(
    ("crear", "mensaje"),
    [
        (lambda: EgresoEntrada(concepto="x", monto=23784689123712738912), "El monto no puede ser mayor que $10.000.000."),
        (lambda: AbrirEntrada(base=-1), "La base no puede ser menor que 0."),
        (lambda: DatosPago(metodo="efectivo", recibido=99_999_999), "El efectivo recibido no puede ser mayor que $10.000.000."),
    ],
)
def test_montos_absurdos(crear, mensaje):
    with pytest.raises(ValidationError) as error:
        crear()
    assert _mensaje_de(error.value) == mensaje


def test_plan_con_precio_y_horas_realistas():
    valido = {"precioMensual": 100000, "descuentoMesa": 25, "horasGratisMes": 5, "descuentoBar": 10, "descuentoTorneo": 100}
    PlanEntrada.model_validate(valido)
    with pytest.raises(ValidationError) as error:
        PlanEntrada.model_validate({**valido, "horasGratisMes": 101})
    assert _mensaje_de(error.value) == "Las horas gratis no pueden ser mayor que 100."
