from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel

from app.tiempo import a_milisegundos

# Las fechas salen como milisegundos desde 1970, igual que Date.now() en el frontend.
Milisegundos = Annotated[datetime, PlainSerializer(a_milisegundos, return_type=int)]


class EsquemaCamel(BaseModel):
    """Entra y sale con los nombres del frontend (precioMensual), aunque en Python sean precio_mensual."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
