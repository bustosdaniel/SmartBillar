"""Celular con país. La misma lista está en frontend/src/auth/celular.ts (si cambia una, cambiar la otra).

Se guarda en formato internacional: "+573001234567".
"""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Pais:
    nombre: str
    indicativo: str
    digitos: int
    patron: re.Pattern[str]
    # Lo que va entre el indicativo y el número al marcar a un celular (Argentina: +54 9 …).
    prefijo_movil: str = ""


PAISES = [
    Pais("Colombia", "57", 10, re.compile(r"3\d{9}")),
    Pais("Argentina", "54", 10, re.compile(r"[1-9]\d{9}"), prefijo_movil="9"),
    Pais("Brasil", "55", 11, re.compile(r"[1-9]{2}9\d{8}")),
    Pais("Chile", "56", 9, re.compile(r"9\d{8}")),
    Pais("Ecuador", "593", 9, re.compile(r"9\d{8}")),
    Pais("España", "34", 9, re.compile(r"[67]\d{8}")),
    Pais("Estados Unidos", "1", 10, re.compile(r"[2-9]\d{2}[2-9]\d{6}")),
    Pais("México", "52", 10, re.compile(r"[1-9]\d{9}")),
    Pais("Panamá", "507", 8, re.compile(r"6\d{7}")),
    Pais("Perú", "51", 9, re.compile(r"9\d{8}")),
    Pais("Venezuela", "58", 10, re.compile(r"4(?:1[246]|2[46])\d{7}")),
]
COLOMBIA = PAISES[0]
# Primero los indicativos más largos: "+593" es Ecuador aunque empiece como "+59…".
_POR_INDICATIVO = sorted(PAISES, key=lambda pais: len(pais.indicativo + pais.prefijo_movil), reverse=True)


def normalizar_celular(valor: str) -> str:
    """Devuelve el celular como "+573001234567" o lanza ValueError.

    Sin "+" se toma como colombiano (con o sin el 57), como se enviaba antes del selector de país.
    """
    texto = re.sub(r"[\s().-]", "", valor)
    if not texto.startswith("+"):
        colombiano = re.fullmatch(r"(?:57)?(3\d{9})", texto)
        if colombiano is None:
            raise ValueError("El celular debe tener 10 dígitos y empezar por 3.")
        return f"+57{colombiano.group(1)}"
    digitos = texto[1:]
    if not digitos.isdigit():
        raise ValueError("El celular no es válido.")
    for pais in _POR_INDICATIVO:
        inicio = pais.indicativo + pais.prefijo_movil
        if digitos.startswith(inicio):
            numero = digitos[len(inicio):]
            if len(numero) != pais.digitos:
                raise ValueError(f"El celular de {pais.nombre} debe tener {pais.digitos} dígitos.")
            if not pais.patron.fullmatch(numero):
                raise ValueError(f"No es un celular válido de {pais.nombre}.")
            return f"+{inicio}{numero}"
    raise ValueError("Ese país no está en la lista de celulares permitidos.")
