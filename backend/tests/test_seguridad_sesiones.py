from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import deps
from app.seguridad import crear_token, encriptar_password, leer_token
from app.services import usuarios as servicio
from app.tiempo import ahora_utc

CLAVE = "Clave123!"


def _usuario(**extra):
    datos = dict(
        id=1,
        password_hash=encriptar_password(CLAVE),
        intentos_fallidos=0,
        bloqueado_hasta=None,
        eliminado_en=None,
        version_sesion=0,
    )
    return SimpleNamespace(**(datos | extra))


def test_cinco_contrasenas_erradas_bloquean_la_cuenta_aunque_despues_se_escriba_bien(monkeypatch):
    usuario = _usuario()
    monkeypatch.setattr(servicio, "buscar_por_email", lambda _db, _email: usuario)
    for _ in range(servicio.INTENTOS_MAXIMOS):
        assert servicio.autenticar(None, "a@b.co", "mala") is None
    assert usuario.bloqueado_hasta is not None
    with pytest.raises(servicio.CuentaBloqueada, match="espera 15 minutos"):
        servicio.autenticar(None, "a@b.co", CLAVE)


def test_pasado_el_bloqueo_vuelve_a_entrar_y_se_reinicia_el_conteo(monkeypatch):
    usuario = _usuario(intentos_fallidos=3, bloqueado_hasta=ahora_utc() - timedelta(minutes=1))
    monkeypatch.setattr(servicio, "buscar_por_email", lambda _db, _email: usuario)
    assert servicio.autenticar(None, "a@b.co", CLAVE) is usuario
    assert (usuario.intentos_fallidos, usuario.bloqueado_hasta) == (0, None)


def test_el_token_lleva_la_version_de_sesion_y_uno_alterado_no_sirve():
    token = crear_token(7, version=3)
    assert leer_token(token) == (7, 3)
    assert leer_token(token[:-2] + "xx") is None


@pytest.mark.parametrize(
    "usuario",
    [
        _usuario(version_sesion=1),  # cambió la contraseña: el token viejo (versión 0) ya no sirve
        _usuario(eliminado_en=ahora_utc()),  # cuenta eliminada
    ],
)
def test_un_token_viejo_o_de_una_cuenta_eliminada_recibe_401(usuario):
    db = SimpleNamespace(get=lambda _modelo, _id: usuario, info={})
    credenciales = SimpleNamespace(credentials=crear_token(1, version=0))
    with pytest.raises(HTTPException) as error:
        deps.usuario_actual(db, credenciales)
    assert error.value.status_code == 401
