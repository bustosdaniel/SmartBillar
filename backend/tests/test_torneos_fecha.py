from datetime import date, time

import pytest

from app.models import Jugador, Torneo
from app.models.enums import EstadoTorneo
from app.services import torneos
from app.services.usuarios import ErrorDeDatos

HOY = date(2026, 11, 17)


@pytest.fixture(autouse=True)
def hoy_fijo(monkeypatch):
    monkeypatch.setattr(torneos, "_hoy", lambda: HOY)


def _torneo(fecha: date) -> Torneo:
    return Torneo(nombre="Copa", fecha=fecha, hora=time(19, 0), cupos=8, inscripcion=0, premio="Trofeo")


def test_las_inscripciones_cierran_al_empezar_el_dia_del_torneo():
    assert not torneos._inscripciones_cerradas(_torneo(date(2026, 11, 18)))
    assert torneos._inscripciones_cerradas(_torneo(HOY))
    assert torneos._inscripciones_cerradas(_torneo(date(2026, 11, 16)))


def test_no_se_puede_crear_un_torneo_para_hoy():
    with pytest.raises(ErrorDeDatos, match="a partir de mañana"):
        torneos.crear(None, nombre="Copa", modo="pool", categoria="abierta", fecha=HOY, hora=time(23, 0), cupos=8, inscripcion=0, premio="Trofeo")


@pytest.mark.parametrize("estado", [EstadoTorneo.EN_CURSO, EstadoTorneo.FINALIZADO])
def test_un_torneo_que_ya_se_jugo_no_se_elimina(monkeypatch, estado):
    torneo = _torneo(date(2026, 11, 20))
    torneo.estado = estado
    monkeypatch.setattr(torneos, "_torneo", lambda _db, _id: torneo)
    with pytest.raises(ErrorDeDatos, match="ya se jugó"):
        torneos.eliminar(None, 1)


def test_con_inscritos_hay_que_quitarlos_antes_de_eliminar(monkeypatch):
    torneo = _torneo(date(2026, 11, 20))
    torneo.estado = EstadoTorneo.INSCRIPCIONES
    torneo.jugadores.append(Jugador(cliente_id=1, nombre="Ana", pagado=True, monto=0))
    monkeypatch.setattr(torneos, "_torneo", lambda _db, _id: torneo)
    with pytest.raises(ErrorDeDatos, match="Quita primero"):
        torneos.eliminar(None, 1)
