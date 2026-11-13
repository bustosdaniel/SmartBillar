"""Contraseñas y tokens de sesión."""

import jwt

from app.config import configuracion
from app.seguridad import ALGORITMO, crear_token, encriptar_password, leer_token, verificar_password


def test_la_contrasena_no_se_guarda_en_texto_plano():
    hash_ = encriptar_password("Billar2026*")
    assert "Billar2026*" not in hash_
    assert verificar_password("Billar2026*", hash_)
    assert not verificar_password("otra", hash_)


def test_un_hash_danado_no_revienta_el_login():
    assert not verificar_password("x", "no-es-un-hash")


def test_el_token_lleva_usuario_y_version_de_sesion():
    assert leer_token(crear_token(5, 3)) == (5, 3)


def test_los_tokens_viejos_sin_version_cuentan_como_version_0():
    viejo = jwt.encode({"sub": "5", "exp": 9_999_999_999}, configuracion.jwt_secreto, algorithm=ALGORITMO)
    assert leer_token(viejo) == (5, 0)


def test_token_alterado_o_vencido_no_sirve():
    assert leer_token(crear_token(5) + "x") is None
    vencido = jwt.encode({"sub": "5", "exp": 1}, configuracion.jwt_secreto, algorithm=ALGORITMO)
    assert leer_token(vencido) is None
    ajeno = jwt.encode({"sub": "5", "exp": 9_999_999_999}, "otra-clave-distinta-de-la-del-servidor-1234", algorithm=ALGORITMO)
    assert leer_token(ajeno) is None


def test_la_contrasena_temporal_cumple_las_reglas_y_no_se_repite():
    from app.schemas.usuarios import _validar_password_nueva
    from app.services.usuarios import password_temporal

    temporales = {password_temporal() for _ in range(50)}
    assert len(temporales) == 50
    for temporal in temporales:
        assert _validar_password_nueva(temporal) == temporal
