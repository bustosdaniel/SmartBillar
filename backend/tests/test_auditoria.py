from types import SimpleNamespace

from app.db import registrar_responsable
from app.models import Egreso, Movimiento, Pago
from app.models.enums import MetodoPago, TipoMovimiento


def test_lo_nuevo_queda_a_nombre_del_empleado_de_la_peticion():
    pago = Pago(concepto="Mesa 1", cliente_nombre="Ana", monto=15_000, metodo=MetodoPago.EFECTIVO)
    egreso = Egreso(concepto="Tizas", monto=5_000)
    movimiento = Movimiento(tipo=TipoMovimiento.CAJA, titulo="Caja abierta", detalle="Base $100.000")
    ya_tenia = Egreso(concepto="Hielo", monto=2_000, registrado_por_id=9)
    sesion = SimpleNamespace(info={"usuario_id": 7}, new=[pago, egreso, movimiento, ya_tenia, object()])

    registrar_responsable(sesion, None, None)

    assert (pago.registrado_por_id, egreso.registrado_por_id, movimiento.registrado_por_id) == (7, 7, 7)
    assert ya_tenia.registrado_por_id == 9


def test_sin_sesion_iniciada_no_se_asigna_a_nadie():
    egreso = Egreso(concepto="Tizas", monto=5_000)
    registrar_responsable(SimpleNamespace(info={}, new=[egreso]), None, None)
    assert egreso.registrado_por_id is None
