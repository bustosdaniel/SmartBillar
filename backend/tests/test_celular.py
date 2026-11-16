import pytest

from app.schemas.celular import normalizar_celular


@pytest.mark.parametrize(
    ("escrito", "guardado"),
    [
        ("+573001234567", "+573001234567"),
        # Como llegaba antes del selector de país: colombiano, con o sin 57 y separadores.
        ("3001234567", "+573001234567"),
        ("57 300 123 4567", "+573001234567"),
        ("+34 612 345 678", "+34612345678"),
        ("+593991234567", "+593991234567"),
        ("+5491123456789", "+5491123456789"),
    ],
)
def test_guarda_el_celular_en_formato_internacional(escrito, guardado):
    assert normalizar_celular(escrito) == guardado


@pytest.mark.parametrize(
    ("escrito", "mensaje"),
    [
        ("6011234567", "El celular debe tener 10 dígitos y empezar por 3."),
        ("+57300123456", "El celular de Colombia debe tener 10 dígitos."),
        ("+576011234567", "No es un celular válido de Colombia."),
        ("+3430012345", "El celular de España debe tener 9 dígitos."),
        ("+447911123456", "Ese país no está en la lista de celulares permitidos."),
        ("+57abc", "El celular no es válido."),
    ],
)
def test_rechaza_celulares_que_no_son_validos(escrito, mensaje):
    with pytest.raises(ValueError, match=mensaje):
        normalizar_celular(escrito)
