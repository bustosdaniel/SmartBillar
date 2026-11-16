import pytest
from pydantic import ValidationError

from app.schemas.usuarios import DatosPersonales, correo_valido
from app.services.usuarios import nombre_completo

VALIDOS = {
    "primer_nombre": "Neifer",
    "segundo_nombre": "Daniel",
    "primer_apellido": "Bustos",
    "segundo_apellido": "Carrillo",
    "email": "neifer@gmail.com",
    "telefono": "+573001234567",
}


def test_acepta_el_nombre_en_partes_y_el_segundo_nombre_es_opcional():
    datos = DatosPersonales(**{**VALIDOS, "segundo_nombre": ""})
    assert datos.segundo_nombre == ""
    assert nombre_completo(datos.primer_nombre, datos.segundo_nombre, datos.primer_apellido, datos.segundo_apellido) == (
        "Neifer Bustos Carrillo"
    )


@pytest.mark.parametrize("campo", ["primer_nombre", "primer_apellido", "segundo_apellido"])
def test_exige_primer_nombre_y_los_dos_apellidos(campo):
    with pytest.raises(ValidationError):
        DatosPersonales(**{**VALIDOS, campo: ""})


@pytest.mark.parametrize("valor", ["374727834", "Juan3", "Ju@n", "A" * 26])
def test_rechaza_partes_con_numeros_simbolos_o_muy_largas(valor):
    with pytest.raises(ValidationError):
        DatosPersonales(**{**VALIDOS, "segundo_nombre": valor})


@pytest.mark.parametrize("correo", ["a@gmail.com", "a.b@campusucc.edu.co", "a@empresa.com.co", "a@hotmail.es"])
def test_correos_validos(correo):
    assert correo_valido(correo)


@pytest.mark.parametrize("correo", ["a@gmail", "a@gmail.com.", "a@gmail.com.coo", "a@gmail.com.co.x", "a@@b.com", "a..b@gmail.com"])
def test_correos_invalidos(correo):
    assert not correo_valido(correo)
