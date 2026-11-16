from types import SimpleNamespace

import pytest

from app.models.enums import MetodoPago
from app.services import caja as servicio
from app.services.usuarios import ErrorDeDatos


class SesionFalsa:
    def add(self, _objeto):
        pass

    def flush(self):
        pass


def _caja(egresos=()):
    return SimpleNamespace(id=1, base=100_000, pagos=[], egresos=list(egresos))


def test_un_egreso_por_transferencia_no_toca_el_efectivo_del_cajon():
    caja = _caja([SimpleNamespace(monto=1_500_000, metodo=MetodoPago.TRANSFERENCIA)])
    assert servicio.efectivo_esperado(caja) == 100_000


def test_en_efectivo_no_puede_pasar_de_lo_que_hay_pero_por_transferencia_si(monkeypatch):
    caja = _caja()
    monkeypatch.setattr(servicio, "_exigir_abierta", lambda _db: caja)
    with pytest.raises(ErrorDeDatos, match="solo hay"):
        servicio.registrar_egreso(SesionFalsa(), "Insumos", 1_500_000)
    egreso = servicio.registrar_egreso(SesionFalsa(), "Insumos", 1_500_000, MetodoPago.TRANSFERENCIA)
    assert egreso.metodo == MetodoPago.TRANSFERENCIA


def test_una_transferencia_exige_la_referencia_del_comprobante(monkeypatch):
    caja = _caja()
    monkeypatch.setattr(servicio, "_exigir_abierta", lambda _db: caja)
    avisos = []
    monkeypatch.setattr(servicio, "notificar_administradores", lambda _db, _tipo, asunto, mensaje, ruta=None: avisos.append(mensaje))
    datos = dict(concepto="Mesa 1", cliente="Ana", monto=15_000, metodo=MetodoPago.TRANSFERENCIA)
    with pytest.raises(ErrorDeDatos, match="referencia"):
        servicio.registrar_pago(SesionFalsa(), **datos)
    pago = servicio.registrar_pago(SesionFalsa(), **datos, referencia=" M12345678 ")
    assert pago.referencia == "M12345678"
    # Todo el personal se entera del cobro.
    assert avisos == ["Ana pagó $ 15.000 por transferencia (ref. M12345678)."]
