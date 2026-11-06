"""Llaves de eliminación directa. Misma lógica que frontend/src/torneos/llaves.ts (lógica pura, sin base de datos).

Los jugadores se identifican por una clave cualquiera (su id en la base, o un texto en la demo)."""

from dataclasses import dataclass, replace
from typing import Hashable


@dataclass(frozen=True)
class PartidoLlave:
    ronda: int
    posicion: int
    a: Hashable | None = None
    b: Hashable | None = None
    ganador: Hashable | None = None


def total_rondas(partidos: list[PartidoLlave]) -> int:
    return max((p.ronda + 1 for p in partidos), default=0)


def _siguiente(partidos: list[PartidoLlave], partido: PartidoLlave) -> PartidoLlave | None:
    return next((p for p in partidos if p.ronda == partido.ronda + 1 and p.posicion == partido.posicion // 2), None)


def _avanzar(partidos: list[PartidoLlave], partido: PartidoLlave) -> list[PartidoLlave]:
    """Lleva al ganador al hueco que le toca en la ronda siguiente."""
    siguiente = _siguiente(partidos, partido)
    if siguiente is None:
        return partidos
    lado = "a" if partido.posicion % 2 == 0 else "b"
    actualizado = replace(siguiente, **{lado: partido.ganador})
    return [actualizado if p is siguiente else p for p in partidos]


def generar_llaves(jugadores: list[Hashable]) -> list[PartidoLlave]:
    """Si los inscritos no completan una potencia de 2, los primeros reciben pase directo."""
    tamano = 2
    while tamano < len(jugadores):
        tamano *= 2
    lugares = [*jugadores, *([None] * (tamano - len(jugadores)))]

    partidos: list[PartidoLlave] = []
    ronda, cantidad = 0, tamano // 2
    while cantidad >= 1:
        for posicion in range(cantidad):
            primera = ronda == 0
            partidos.append(
                PartidoLlave(
                    ronda=ronda,
                    posicion=posicion,
                    a=lugares[posicion] if primera else None,
                    b=lugares[tamano - 1 - posicion] if primera else None,
                )
            )
        ronda, cantidad = ronda + 1, cantidad // 2

    for partido in [p for p in partidos if p.ronda == 0]:
        solo = partido.b if partido.a is None else partido.a if partido.b is None else None
        if solo is None:
            continue
        con_pase = replace(partido, ganador=solo)
        partidos = _avanzar([con_pase if p == partido else p for p in partidos], con_pase)
    return partidos


def puede_definirse(partidos: list[PartidoLlave], partido: PartidoLlave) -> bool:
    """Solo se puede cambiar un resultado mientras el partido siguiente no se haya jugado."""
    if partido.a is None or partido.b is None:
        return False
    siguiente = _siguiente(partidos, partido)
    return siguiente is None or siguiente.ganador is None


def definir_ganador(partidos: list[PartidoLlave], ronda: int, posicion: int, jugador: Hashable) -> list[PartidoLlave]:
    partido = next((p for p in partidos if p.ronda == ronda and p.posicion == posicion), None)
    if partido is None or not puede_definirse(partidos, partido) or jugador not in (partido.a, partido.b):
        return partidos
    actualizado = replace(partido, ganador=jugador)
    return _avanzar([actualizado if p is partido else p for p in partidos], actualizado)


def campeon(partidos: list[PartidoLlave]) -> Hashable | None:
    rondas = total_rondas(partidos)
    final = next((p for p in partidos if p.ronda == rondas - 1), None)
    return final.ganador if final else None
